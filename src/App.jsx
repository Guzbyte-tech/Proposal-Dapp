import { Box } from "@radix-ui/themes";
import Layout from "./components/Layout";
import CreateProposalModal from "./components/CreateProposalModal";
import Proposals from "./components/Proposals";
import useContract from "./hooks/useContract";
import { useCallback, useEffect, useState } from "react";
import { Contract } from "ethers";
import useRunners from "./hooks/useRunners";
import { Interface } from "ethers";
import ABI from "./ABI/proposal.json";
import { useRef } from "react"; // Import useRef

const multicallAbi = [
  "function tryAggregate(bool requireSuccess, (address target, bytes callData)[] calls) returns ((bool success, bytes returnData)[] returnData)",
];

function App() {
  const readOnlyProposalContract = useContract(true);
  const { readOnlyProvider } = useRunners();
  const [proposals, setProposals] = useState([]);
  const hasVotingListener = useRef(false); // Ref to track listener
  const hasExecuteListener = useRef(false); // Ref to track listener

  const handleProposalCreation = useCallback(
    async (
      proposalId,
      description,
      recipient,
      amount,
      votingDeadline,
      minVotesToPass
    ) => {
      try {
        setProposals((prevProposals) => [
          ...prevProposals,
          {
            id: proposalId.toString(),
            description,
            amount: amount,
            deadline: votingDeadline,
            minRequiredVote: minVotesToPass.toString(),
            votecount: 0,
            executed: false,
          },
        ]);
      } catch (error) {
        console.log("Error handling ProposalCreated event: ", error);
      }
    },
    []
  );

  const handleVotingEvent = useCallback(
    (proposalId, voter) => {
      console.log("Voted Proposal Id: ", proposalId);
      console.log("Voter Address: ", voter);
      console.log("event call");
      setProposals((prevProposals) =>
        prevProposals.map((proposal) => {
          if (Number(proposal.id) === Number(proposalId)) {
            console.log(
              `Updating proposal ${proposalId} votecount from ${proposal.votecount}`
            );
            return { ...proposal, votecount: Number(proposal.votecount) + 1 };
          }
          return proposal;
        })
      );
    },
    [setProposals]
  );


  const handleExecuteEvent = useCallback(
    (proposalId) => {
      setProposals((prevProposals) =>
        prevProposals.map((proposal) => {
          if (Number(proposal.id) === Number(proposalId)) {
            return { ...proposal, executed: true };
          }
          return proposal;
        })
      );
    },
    [setProposals]
  );



  useEffect(() => {
    if (readOnlyProposalContract && !hasVotingListener.current) {
      readOnlyProposalContract.on("ProposalCreated", handleProposalCreation);
      readOnlyProposalContract.on("Voted", handleVotingEvent);
      hasVotingListener.current = true; // Set the ref to true
      hasExecuteListener.current = true;

      readOnlyProposalContract.on("ProposalExecuted", handleExecuteEvent);


      return () => {
        readOnlyProposalContract.off("ProposalCreated", handleProposalCreation);
        readOnlyProposalContract.off("Voted", handleVotingEvent);
        hasVotingListener.current = false; // Reset the ref
        readOnlyProposalContract.off("ProposalExecuted", handleExecuteEvent);
        hasExecuteListener.current = false;
      };
    }
  }, [handleExecuteEvent, handleProposalCreation, handleVotingEvent, readOnlyProposalContract]);



  

  const fetchProposals = useCallback(async () => {
    if (!readOnlyProposalContract) return;

    const multicallContract = new Contract(
      import.meta.env.VITE_MULTICALL_ADDRESS,
      multicallAbi,
      readOnlyProvider
    );

    const itf = new Interface(ABI);

    try {
      const proposalCount = Number(
        await readOnlyProposalContract.proposalCount()
      );

      const proposalsIds = Array.from(
        { length: proposalCount - 1 },
        (_, i) => i + 1
      );

      const calls = proposalsIds.map((id) => ({
        target: import.meta.env.VITE_CONTRACT_ADDRESS,
        callData: itf.encodeFunctionData("proposals", [id]),
      }));

      const responses = await multicallContract.tryAggregate.staticCall(
        true,
        calls
      );

      const decodedResults = responses.map((res) =>
        itf.decodeFunctionResult("proposals", res.returnData)
      );

      const data = decodedResults.map((proposalStruct, index) => ({
        id: index + 1,
        description: proposalStruct.description,
        amount: proposalStruct.amount,
        minRequiredVote: proposalStruct.minVotesToPass,
        votecount: proposalStruct.voteCount,
        deadline: proposalStruct.votingDeadline,
        executed: proposalStruct.executed,
      }));
      setProposals(data);
    } catch (error) {
      console.log("error fetching proposals: ", error);
    }
  }, [readOnlyProposalContract, readOnlyProvider]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  // const updateVoteCount = (proposalId, newVoteCount) => {
  //   //Listen to Vote Event.

  //   setProposals((prevProposals) =>
  //     prevProposals.map((proposal) =>
  //       proposal.id === proposalId
  //         ? { ...proposal, votecount: newVoteCount }
  //         : proposal
  //     )
  //   );
  // };

  return (
    <Layout>
      <Box className="flex justify-end p-4">
        <CreateProposalModal />
      </Box>
      <Proposals
        proposals={proposals}
        // updateVoteCount={updateVoteCount}
      />
    </Layout>
  );
}

export default App;
