import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { ResolutionsVoting } from './../typechain-types/contracts/ResolutionsVoting';
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";

describe("ResolutionsVoting unit tests", () => {

  const initBlockChainCommonContext = async () => {
    // Wallets
    const [owner, otherAccount1, otherAccount2] = await ethers.getSigners();
    // Deployment
    const ResolutionsVoting = await ethers.getContractFactory("ResolutionsVoting");
    const resolutionsVoting = await ResolutionsVoting.deploy();

    // Vote HashDescription
    const hashDescription = ethers.keccak256(ethers.toUtf8Bytes("Test question vote ?"));

    console.log(`Deployed SmartContract successfully : ${await resolutionsVoting.getAddress()}`);
    // To use
    return { resolutionsVoting, owner, otherAccount1, otherAccount2, hashDescription };
  }

  let resolutionsVotingContract: ResolutionsVoting;
  let _owner: HardhatEthersSigner;
  let _otherAccount1: HardhatEthersSigner;
  let _otherAccount2: HardhatEthersSigner;
  let _hashDescription: string;
  let _currentTimestampInSeconds: number;
  let _startDateTimestampInSeconds: number;
  let _endDateTimestampInSeconds: number;


  beforeEach(async () => {
    const { resolutionsVoting, owner, otherAccount1, otherAccount2, hashDescription } = await loadFixture(initBlockChainCommonContext);
    resolutionsVotingContract = resolutionsVoting;
    _owner = owner;
    _otherAccount1 = otherAccount1;
    _otherAccount2 = otherAccount2;
    _hashDescription = hashDescription;
    // Current time
    _currentTimestampInSeconds = Math.round(Date.now() / 1000);
    // Vote StartDate
    _startDateTimestampInSeconds = _currentTimestampInSeconds + 60;
    // Vote EndDate
    _endDateTimestampInSeconds = _startDateTimestampInSeconds + 60;

    await resolutionsVotingContract.addVote(_hashDescription, _startDateTimestampInSeconds, _endDateTimestampInSeconds);
  });

  // Test Deployment
  describe("DEPLOYMENT", () => {
    it("Should deployment be done.", async () => {
      expect(await resolutionsVotingContract.owner()).equal(_owner.address);
      expect(await resolutionsVotingContract.voteId()).equal(1); // initial vote Id equal 0, but one Vote is created for tests, 
      // so the current voteId must equal 1
    });
  });

  // Tests functions
  describe("REGISTRATION", () => {
    it("Should revert if addVoter caller is'nt Admin", async () => {
      await expect(resolutionsVotingContract.connect(_otherAccount1).addVoter(_otherAccount1.address, 0)).to.be.revertedWith("You're not an admin.");
    });

    it("Should revert if registration is'nt before startDate", async () => {
      await time.increaseTo(_startDateTimestampInSeconds + 1);
      await expect(resolutionsVotingContract.addVoter(_otherAccount1.address, 0)).to.be.revertedWith("Voters registration finished.");
    });

    it("Should revert if user already registered", async () => {
      await time.increaseTo(_startDateTimestampInSeconds - 60);
      await resolutionsVotingContract.addVoter(_otherAccount1, 0);
      await expect(resolutionsVotingContract.addVoter(_otherAccount1.address, 0)).to.be.revertedWith("Voter already registered.");
    });

    it("Should success if admin and registration and not yet registered", async () => {
      await time.increaseTo(_startDateTimestampInSeconds - 60);
      await expect(resolutionsVotingContract.addVoter(_otherAccount1.address, 0)).to.be.emit(resolutionsVotingContract, "VoterRegistered").withArgs(_otherAccount1.address, true, 0);
    });
  });


  describe("VOTES", () => {

    it("Should revert if caller is'nt admin", async () => {
      await expect(resolutionsVotingContract.connect(_otherAccount1).addVote(_hashDescription, _startDateTimestampInSeconds, _endDateTimestampInSeconds)).to.be.revertedWith("You're not an admin.");
    });

    it("Should revert if startDat and endDate are not in the future", async () => {
      // Vote StartDate
      const startDateTimestampInSeconds = _currentTimestampInSeconds - 60;
      // Vote EndDate
      const endDateTimestampInSeconds = _currentTimestampInSeconds - 60;
      await expect(resolutionsVotingContract.addVote(_hashDescription, startDateTimestampInSeconds, endDateTimestampInSeconds)).to.be.revertedWith("Start and end dates must be in the future.");
    });

    it("Should revert if current Vote is not completed yet", async () => {
      // Vote StartDate
      const startDateTimestampInSeconds = _currentTimestampInSeconds + 120;
      // Vote EndDate
      const endDateTimestampInSeconds = _currentTimestampInSeconds + 180;
      await expect(resolutionsVotingContract.addVote(_hashDescription, startDateTimestampInSeconds, endDateTimestampInSeconds)).to.be.revertedWith("Current vote has not yet been completed.");
    });

    it("Should success if admin, future and current vote completed", async () => {

      // To finished the current vote
      await time.increaseTo(_endDateTimestampInSeconds + 1);
      await resolutionsVotingContract.tallyVotes();

      // Vote StartDate
      const startDateTimestampInSeconds = _currentTimestampInSeconds + 360;
      // Vote EndDate
      const endDateTimestampInSeconds = _currentTimestampInSeconds + 420;

      await expect(resolutionsVotingContract.addVote(_hashDescription, startDateTimestampInSeconds, endDateTimestampInSeconds)).to.be.emit(resolutionsVotingContract, "VoteCreatedActivated").withArgs(_hashDescription, 2, startDateTimestampInSeconds, endDateTimestampInSeconds, _owner.address, 1, true);
    });
  });

  describe("VOTING", () => {

    describe("VOTE_CHOICE", () => {

      it("Should revert if user is'nt registered yet", async () => {
        await expect(resolutionsVotingContract.connect(_otherAccount2).setVoteChoice("POUR")).to.be.revertedWith("You're not a voter.");
      });

      it("Should revert if is'nt during voting session", async () => {
        await resolutionsVotingContract.addVoter(_otherAccount1.address, 0);
        await expect(resolutionsVotingContract.connect(_otherAccount1).setVoteChoice("POUR")).to.be.revertedWith("Voting session not yet started or it's finished.");
      });

      it("Should revert if voter already voted", async () => {
        await resolutionsVotingContract.addVoter(_otherAccount1.address, 0);
        await time.increaseTo(_startDateTimestampInSeconds + 10);
        await resolutionsVotingContract.connect(_otherAccount1).setVoteChoice("POUR");
        await expect(resolutionsVotingContract.connect(_otherAccount1).setVoteChoice("POUR")).to.be.revertedWith("You have already voted.");
      });

      it("Should success if registered, voting session and not voted yet", async () => {

        await resolutionsVotingContract.addVoter(_otherAccount1.address, 0);
        await time.increaseTo(_startDateTimestampInSeconds + 10);

        await expect(resolutionsVotingContract.connect(_otherAccount1).setVoteChoice("POUR")).to.be.emit(resolutionsVotingContract, "Voted").withArgs(1, _otherAccount1.address, true, 0, "POUR");
      });
    });

    describe("TALLY_VOTES", () => {

      it("Should revert if caller is'nt admin", async () => {
        await expect(resolutionsVotingContract.connect(_otherAccount1).tallyVotes()).to.be.revertedWith("You're not an admin.");
      });

      it("Should revert if voting session has not finished yet", async () => {
        await expect(resolutionsVotingContract.tallyVotes()).to.be.revertedWith("Voting session not yet finished.");
      });

      it("Should revert if vote already completed", async () => {
        await time.increaseTo(_endDateTimestampInSeconds + 1);
        await resolutionsVotingContract.tallyVotes();
        await expect(resolutionsVotingContract.tallyVotes()).to.be.revertedWith("Current vote has been completed.");
      });

      it("Should success if admin, voting session finished and vote not yet completed", async () => {
        await time.increaseTo(_endDateTimestampInSeconds + 1);
        await expect(resolutionsVotingContract.tallyVotes()).to.be.emit(resolutionsVotingContract, "VoteCompleted").withArgs(_hashDescription, 1, _startDateTimestampInSeconds, _endDateTimestampInSeconds, _owner.address, 1, false);
      });
    });
  });

  describe("GETTERS", () => {

    beforeEach(async () => {
      await resolutionsVotingContract.addVoter(_otherAccount1.address, 0);
    });

    describe("GET_REGISTERED_VOTER", () => {
      it("Should revert if caller is'nt admin", async () => {
        await expect(resolutionsVotingContract.connect(_otherAccount1).getRegisteredVoter(_otherAccount1.address)).to.be.revertedWith("You're not an admin.");
      });

      it("Should success if admin", async () => {
        const voterReturned = [true, false, 0, ""];
        expect((await resolutionsVotingContract.getRegisteredVoter(_otherAccount1.address)).toString()).equals(voterReturned.toString());
      });
    });

    describe("GET_REGISTERED_VOTER_FOR_VOTER", () => {
      it("Should revert if caller is'nt voter", async () => {
        await expect(resolutionsVotingContract.connect(_otherAccount2).getRegisteredVoterForVoter()).to.be.revertedWith("You're not a voter.");
      });

      it("Should success if voter", async () => {
        const voterReturned = [true, false, 0, ""];
        expect((await resolutionsVotingContract.connect(_otherAccount1).getRegisteredVoterForVoter()).toString()).equals(voterReturned.toString());
      });
    });

    describe("GET_VOTED_VOTER", () => {
      it("Should revert if caller is'nt admin", async () => {
        await expect(resolutionsVotingContract.connect(_otherAccount1).getVotedVoter(1, _otherAccount1.address)).to.be.revertedWith("You're not an admin.");
      });

      it("Should success if admin", async () => {
        const voterReturned = [true, true, 0, "OUI"];
        await time.increaseTo(_startDateTimestampInSeconds + 1);
        await resolutionsVotingContract.connect(_otherAccount1).setVoteChoice("OUI");
        expect((await resolutionsVotingContract.getVotedVoter(1, _otherAccount1.address)).toString()).equals(voterReturned.toString());
      });
    });

    describe("GET_VOTED_VOTER_FOR_VOTER", () => {
      it("Should revert if caller is'nt voter", async () => {
        await expect(resolutionsVotingContract.connect(_otherAccount2).getVotedVoterForVoter(1)).to.be.revertedWith("You're not a voter.");
      });

      it("Should success if voter", async () => {
        const voterReturned = [true, true, 0, "OUI"];
        await time.increaseTo(_startDateTimestampInSeconds + 1);
        await resolutionsVotingContract.connect(_otherAccount1).setVoteChoice("OUI");
        expect((await resolutionsVotingContract.connect(_otherAccount1).getVotedVoterForVoter(1)).toString()).equals(voterReturned.toString());
      });
    });

    describe("GET_VOTE", () => {
      it("Should revert if caller is'nt voter", async () => {
        await expect(resolutionsVotingContract.connect(_otherAccount2).getVote(1)).to.be.revertedWith("You're not a voter.");
      });

      it("Should success if voter", async () => {
        const voteReturned = [_hashDescription, _startDateTimestampInSeconds, _endDateTimestampInSeconds, true];
        expect((await resolutionsVotingContract.connect(_otherAccount1).getVote(1)).toString()).equals(voteReturned.toString());
      });
    });

    describe("GET_CURRENT_VOTE", () => {
      it("Should revert if caller is'nt voter", async () => {
        await expect(resolutionsVotingContract.connect(_otherAccount2).getCurrentVote()).to.be.revertedWith("You're not a voter.");
      });

      it("Should success if voter", async () => {
        const voteReturned = [_hashDescription, _startDateTimestampInSeconds, _endDateTimestampInSeconds, true];
        expect((await resolutionsVotingContract.connect(_otherAccount1).getCurrentVote()).toString()).equals(voteReturned.toString());
      });
    });
  });
});