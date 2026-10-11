// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SLAManager
 * @notice Automated SLA & Penalty Execution Smart Contract System for Web3 and Microservices.
 * Microservice providers stake collateral against defined SLA metrics (latency, failure limit).
 * An off-chain Monitoring Oracle records telemetry and automatically triggers penalty payouts
 * directly to the client if SLA terms are breached.
 */
contract SLAManager is Ownable, ReentrancyGuard {

    enum ServiceStatus {
        Active,
        Breached,
        Terminated,
        Completed
    }

    struct SLA {
        uint256 id;
        address payable provider;
        address payable client;
        string apiEndpoint;
        uint256 maxLatencyMs;
        uint256 consecutiveFailureLimit;
        uint256 currentFailures;
        uint256 stakedCollateral;
        uint256 penaltyAmount;
        ServiceStatus status;
        uint256 createdAt;
        uint256 duration; // in seconds
    }

    // Storage
    uint256 private _slaCounter;
    mapping(uint256 => SLA) public slas;
    address public oracle;

    // Events
    event SLACreated(
        uint256 indexed slaId,
        address indexed provider,
        address indexed client,
        string apiEndpoint,
        uint256 collateral,
        uint256 penaltyAmount,
        uint256 maxLatencyMs,
        uint256 consecutiveFailureLimit
    );

    event SLACheckFailed(
        uint256 indexed slaId,
        uint256 failureCount,
        uint256 measuredLatency,
        string reason
    );

    event SLACheckPassed(
        uint256 indexed slaId,
        uint256 measuredLatency
    );

    event SLABreached(
        uint256 indexed slaId,
        uint256 penaltyPaid,
        address indexed client,
        uint256 refundToProvider
    );

    event SLAResolved(
        uint256 indexed slaId,
        uint256 returnedCollateral,
        address indexed provider
    );

    event SLATerminated(
        uint256 indexed slaId,
        uint256 returnedCollateral,
        address indexed provider
    );

    event OracleUpdated(
        address indexed oldOracle,
        address indexed newOracle
    );

    // Modifiers
    modifier onlyOracle() {
        require(msg.sender == oracle || msg.sender == owner(), "SLAManager: Caller is not the authorized oracle");
        _;
    }

    constructor(address _oracle) Ownable(msg.sender) {
        oracle = _oracle != address(0) ? _oracle : msg.sender;
    }

    /**
     * @notice Updates the authorized monitoring oracle address.
     * @param _newOracle Address of the new oracle bot wallet.
     */
    function setOracle(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "SLAManager: Invalid oracle address");
        emit OracleUpdated(oracle, _newOracle);
        oracle = _newOracle;
    }

    /**
     * @notice Registers a new SLA agreement and stakes required collateral.
     * @param _client Address of the consumer/client to receive penalty payouts.
     * @param _apiEndpoint Target URL of the microservice endpoint.
     * @param _maxLatencyMs Max allowable response latency in milliseconds before penalty.
     * @param _consecutiveFailureLimit Number of sequential breaches allowed before full breach trigger.
     * @param _penaltyAmount Penalty in wei transferred to client on breach.
     * @param _duration Duration in seconds before the agreement can be cleanly resolved.
     */
    function createSLA(
        address payable _client,
        string memory _apiEndpoint,
        uint256 _maxLatencyMs,
        uint256 _consecutiveFailureLimit,
        uint256 _penaltyAmount,
        uint256 _duration
    ) external payable nonReentrant returns (uint256) {
        require(_client != address(0), "SLAManager: Client address cannot be zero");
        require(bytes(_apiEndpoint).length > 0, "SLAManager: API endpoint cannot be empty");
        require(_maxLatencyMs > 0, "SLAManager: Max latency must be > 0");
        require(_consecutiveFailureLimit > 0, "SLAManager: Consecutive failure limit must be > 0");
        require(_penaltyAmount > 0, "SLAManager: Penalty amount must be > 0");
        require(msg.value >= _penaltyAmount, "SLAManager: Staked collateral must be >= penalty amount");

        uint256 slaId = _slaCounter++;

        slas[slaId] = SLA({
            id: slaId,
            provider: payable(msg.sender),
            client: _client,
            apiEndpoint: _apiEndpoint,
            maxLatencyMs: _maxLatencyMs,
            consecutiveFailureLimit: _consecutiveFailureLimit,
            currentFailures: 0,
            stakedCollateral: msg.value,
            penaltyAmount: _penaltyAmount,
            status: ServiceStatus.Active,
            createdAt: block.timestamp,
            duration: _duration > 0 ? _duration : 1 days
        });

        emit SLACreated(
            slaId,
            msg.sender,
            _client,
            _apiEndpoint,
            msg.value,
            _penaltyAmount,
            _maxLatencyMs,
            _consecutiveFailureLimit
        );

        return slaId;
    }

    /**
     * @notice Called by Oracle when a ping check reports an SLA breach (high latency or downtime).
     * @param _slaId The ID of the SLA agreement.
     * @param _measuredLatency Response time in milliseconds measured by Oracle.
     * @param _isDown True if endpoint returned non-200 or timeout.
     */
    function reportBreach(
        uint256 _slaId,
        uint256 _measuredLatency,
        bool _isDown
    ) external onlyOracle nonReentrant {
        SLA storage sla = slas[_slaId];
        require(sla.status == ServiceStatus.Active, "SLAManager: SLA is not active");

        sla.currentFailures += 1;
        string memory reason = _isDown ? "Service Down / HTTP Error" : "High Latency Detected";

        emit SLACheckFailed(_slaId, sla.currentFailures, _measuredLatency, reason);

        // Trigger breach and payout once consecutive failures reach limit
        if (sla.currentFailures >= sla.consecutiveFailureLimit) {
            sla.status = ServiceStatus.Breached;

            uint256 payout = sla.penaltyAmount <= sla.stakedCollateral ? sla.penaltyAmount : sla.stakedCollateral;
            sla.stakedCollateral -= payout;

            uint256 refund = sla.stakedCollateral;
            sla.stakedCollateral = 0;

            // Payout penalty to client
            (bool sentClient, ) = sla.client.call{value: payout}("");
            require(sentClient, "SLAManager: Failed to transfer penalty to client");

            // Return any remaining excess collateral to provider
            if (refund > 0) {
                (bool sentProvider, ) = sla.provider.call{value: refund}("");
                require(sentProvider, "SLAManager: Failed to refund leftover collateral to provider");
            }

            emit SLABreached(_slaId, payout, sla.client, refund);
        }
    }

    /**
     * @notice Called by Oracle when a ping check passes SLA requirements.
     * Resets the consecutive failure counter to 0.
     * @param _slaId The ID of the SLA agreement.
     * @param _measuredLatency Latency in ms recorded by the Oracle.
     */
    function reportSuccess(uint256 _slaId, uint256 _measuredLatency) external onlyOracle {
        SLA storage sla = slas[_slaId];
        require(sla.status == ServiceStatus.Active, "SLAManager: SLA is not active");

        if (sla.currentFailures > 0) {
            sla.currentFailures = 0;
        }

        emit SLACheckPassed(_slaId, _measuredLatency);
    }

    /**
     * @notice Allows provider to resolve the SLA and withdraw remaining staked collateral
     * once the duration has expired without reaching Breached state.
     * @param _slaId The ID of the SLA agreement.
     */
    function resolveSLA(uint256 _slaId) external nonReentrant {
        SLA storage sla = slas[_slaId];
        require(sla.status == ServiceStatus.Active, "SLAManager: SLA is not active");
        require(msg.sender == sla.provider || msg.sender == owner(), "SLAManager: Caller not authorized to resolve");
        require(block.timestamp >= sla.createdAt + sla.duration, "SLAManager: SLA duration has not yet expired");

        sla.status = ServiceStatus.Completed;
        uint256 refund = sla.stakedCollateral;
        sla.stakedCollateral = 0;

        if (refund > 0) {
            (bool sent, ) = sla.provider.call{value: refund}("");
            require(sent, "SLAManager: Failed to return staked collateral to provider");
        }

        emit SLAResolved(_slaId, refund, sla.provider);
    }

    /**
     * @notice Allows provider to terminate SLA early if permitted.
     * @param _slaId The ID of the SLA agreement.
     */
    function terminateSLA(uint256 _slaId) external nonReentrant {
        SLA storage sla = slas[_slaId];
        require(sla.status == ServiceStatus.Active, "SLAManager: SLA is not active");
        require(msg.sender == sla.provider || msg.sender == owner(), "SLAManager: Caller not authorized to terminate");

        sla.status = ServiceStatus.Terminated;
        uint256 refund = sla.stakedCollateral;
        sla.stakedCollateral = 0;

        if (refund > 0) {
            (bool sent, ) = sla.provider.call{value: refund}("");
            require(sent, "SLAManager: Failed to refund collateral");
        }

        emit SLATerminated(_slaId, refund, sla.provider);
    }

    /**
     * @notice Returns total number of SLAs created.
     */
    function getSLACount() external view returns (uint256) {
        return _slaCounter;
    }

    /**
     * @notice Returns single SLA details by ID.
     * @param _slaId ID of the SLA.
     */
    function getSLA(uint256 _slaId) external view returns (SLA memory) {
        require(_slaId < _slaCounter, "SLAManager: SLA does not exist");
        return slas[_slaId];
    }

    /**
     * @notice Returns all created SLAs.
     */
    function getAllSLAs() external view returns (SLA[] memory) {
        SLA[] memory items = new SLA[](_slaCounter);
        for (uint256 i = 0; i < _slaCounter; i++) {
            items[i] = slas[i];
        }
        return items;
    }

    /**
     * @notice Returns list of currently active SLAs.
     */
    function getActiveSLAs() external view returns (SLA[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < _slaCounter; i++) {
            if (slas[i].status == ServiceStatus.Active) {
                activeCount++;
            }
        }

        SLA[] memory activeList = new SLA[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < _slaCounter; i++) {
            if (slas[i].status == ServiceStatus.Active) {
                activeList[index] = slas[i];
                index++;
            }
        }
        return activeList;
    }
}
