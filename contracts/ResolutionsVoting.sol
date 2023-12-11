// SPDX-License-Identifier: MIT

pragma solidity 0.8.22;
/// import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/** 
* @title Project Final : This is a Resolutions Voting contract which uses Openzeppelin Ownable contract 
* @author Alyra 
*/
contract ResolutionsVoting is Ownable {

    /// For Count the created votes and contexts
    /// No limit needed : voteId max = 115792089237316195423570985008687907853269984665640564039457584007913129639935
    uint256 public voteId;
    
    /** 
    * Store/registration voters for any vote (isVoted is ignored here).
    */  
    mapping (address => Voter) voters;

    /** 
    * Store voters and their votes, for each vote.
    * Each voter, after voting, it will be stored here, 
    * After that it resets for the next votes
    */ 
    mapping (uint256 => mapping (address => Voter)) votersVotedByVote; 

    /**
    * Store each vote,
    */
    mapping (uint256 => Vote) votes;

    /// Only one vote is activated
    struct Vote {
        string hashDescription;
        uint256 startDate;  
        uint256 endDate;
        bool isEnabled;
    }

    struct Voter {
        bool isRegistered;
        bool hasVoted;
        Role role;
        string voteChoice;
    }

    enum Role {
        USER,                  /// 0
        ADMIN                  /// 1
    }

    event VoteCreatedActivated (string hashDescription, uint256 voteId, uint256 startDate, uint256 endDate, address adminAddress, Role role, bool isEnabled);
    event VoterRegistered (address voterAddress, bool isRegistered, Role role);
    event Voted (uint256 voteId, address voterAddress, bool isRegistered, Role role, string voteChoice);
    event VoteCompleted (string hashDescription, uint256 voteId, uint256 startDate, uint256 endDate, address adminAddress, Role role, bool isEnabled);

    constructor() Ownable(msg.sender) {
        /// Assign the role ADMIN to Owner and registred it (to be reset it if needed).
        voters[owner()].isRegistered = true;
        voters[owner()].role = Role.ADMIN;

    }
    
    // ::::::::::::: REQUIRES ::::::::::::: //

    modifier onlyVoters() {
        require(voters[msg.sender].isRegistered, "You're not a voter.");
        _;
    }

    modifier onlyAdmin() {
        require(voters[msg.sender].role == Role.ADMIN, "You're not an admin.");
        _;
    }


    ///  registeration       voting            tallyVote
    ///
    /// ---------------|------------------|------------------>
    ///             startDate           endDate
    ///
    ///--------|----------------|-----------------|----------->
    ///
    ///  block_timestamp     block_timestamp      block_timestamp
    ///
    modifier duringVotingSession() {
        /// Get last vote startDate and endDate
        uint256 _startedDate = votes[voteId].startDate;
        uint256 _endedDate = votes[voteId].endDate;
    
        require(_startedDate <= block.timestamp && block.timestamp <=  _endedDate, "Voting session not yet started or it's finished.");
        _;
    }

    modifier beforeVotingSession() {
        require(block.timestamp < votes[voteId].startDate, "Voters registration finished.");
        _;
    }

    modifier afterVotingSession() {
        require(block.timestamp > votes[voteId].endDate, "Voting session not yet finished.");
        _;
    }


    modifier requiredDates(uint256 _startDate, uint256 _endDate) {
        require(
            _startDate < _endDate 
            && _startDate >= block.timestamp 
            && _endDate > block.timestamp, 
            "Start and end dates must be in the future.");
        _;
    }

    // ::::::::::::: GETTERS ::::::::::::: //

    /**
     * @notice any voter can access to other voters information
     * @param _addr voter's address
     * @return Voter is a struct containing variables :  
     *         bool isRegistered, bool hasVoted, Role role, bytes32 voteChoice
     */
    function getRegisteredVoter(address _addr) external onlyAdmin view returns (Voter memory) {
        return voters[_addr];
    }

    function getRegisteredVoterForVoter() external onlyVoters view returns (Voter memory) {
        return voters[msg.sender];
    }

    function getVotedVoter(uint256 _voteId, address _addr) external onlyAdmin view returns (Voter memory) {
        return votersVotedByVote[_voteId][_addr];
    }

    function getVotedVoterForVoter(uint256 _voteId) external onlyVoters view returns (Voter memory) {
        return votersVotedByVote[_voteId][msg.sender];
    }
    
    function getVote(uint256 _voteId) external onlyVoters view returns (Vote memory) {
        return Vote(votes[_voteId].hashDescription, votes[_voteId].startDate, votes[_voteId].endDate, votes[_voteId].isEnabled);
    }

    function getCurrentVote() external onlyVoters view returns (Vote memory) {
        return Vote(votes[voteId].hashDescription, votes[voteId].startDate, votes[voteId].endDate, votes[voteId].isEnabled);
    }

    // ::::::::::::: REGISTRATION ::::::::::::: // 

    /**
     * @notice only the admins of the contract can add voters only during RegisteringVoters. 
     * This function can be accesses externally. 
     * @param _addr, _role the address, role of the new voter
     */
    function addVoter(address _addr, Role _role) external onlyAdmin beforeVotingSession {
        require(!voters[_addr].isRegistered, "Voter already registered.");
        
        voters[_addr].isRegistered = true;
        voters[_addr].role = _role;

        emit VoterRegistered(_addr, true, _role);
    }


    // ::::::::::::: VOTES ::::::::::::: //

    function addVote(string calldata _hashDescription, uint256 _startDate, uint256 _endDate) external onlyAdmin requiredDates(_startDate, _endDate) {
        /// Commented for update vote params
        require(!votes[voteId].isEnabled, "Current vote has not yet been completed.");

        /// Increment current voteId (ignore 0, like DB in web2)
        ++voteId;

        votes[voteId].hashDescription = _hashDescription;
        votes[voteId].startDate = _startDate;
        votes[voteId].endDate = _endDate;
        votes[voteId].isEnabled = true;
        
        emit VoteCreatedActivated(_hashDescription, voteId, _startDate, _endDate, msg.sender, voters[msg.sender].role, true);
    }

    // ::::::::::::: VOTING ::::::::::::: //

    function setVoteChoice(string calldata _voteChoice) external onlyVoters duringVotingSession {
        require(!votersVotedByVote[voteId][msg.sender].hasVoted, "You have already voted.");
        
        votersVotedByVote[voteId][msg.sender].isRegistered = true;
        votersVotedByVote[voteId][msg.sender].hasVoted = true;
        votersVotedByVote[voteId][msg.sender].voteChoice = _voteChoice;
        
        emit Voted(voteId, msg.sender, true, votersVotedByVote[voteId][msg.sender].role, _voteChoice);
    }

    /**
    *
    */
    function tallyVotes() external onlyAdmin afterVotingSession {
         require(votes[voteId].isEnabled, "Current vote has been completed.");
        votes[voteId].isEnabled = false;
        emit VoteCompleted (votes[voteId].hashDescription, voteId, votes[voteId].startDate, votes[voteId].endDate, msg.sender, voters[msg.sender].role, false);
    }
}