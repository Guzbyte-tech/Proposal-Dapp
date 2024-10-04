import { Box, Button, Flex, Text } from "@radix-ui/themes";
import { formatEther } from "ethers";
import { toast } from "react-toastify";
import useContract from "../hooks/useContract";
import { useAppKitAccount } from "@reown/appkit/react";
import { useState } from "react";

const Proposal = ({
  proposalId,
  description,
  amount,
  minRequiredVote,
  votecount,
  deadline,
  executed,
}) => {
  const { address } = useAppKitAccount();
  const contract = useContract(true); // Assuming this gets a contract instance
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false); // New state for executing

  const handleUserVoting = async () => {
    if (!address) {
      toast.error("Please connect your wallet to vote.");
      return;
    }

    if (executed) {
      toast.error("This proposal has already been executed.");
      return;
    }

    try {
      setLoading(true);
      const tx = await contract.vote(proposalId);
      await tx.wait();

      // const updatedProposal = await contract.proposals(proposalId);
      // const newVoteCount = Number(updatedProposal.voteCount);

      // updateVoteCount(proposalId, newVoteCount);

      toast.success("Vote submitted successfully!");
    } catch (error) {
      console.error("Error voting on the proposal:", error);
      toast.error("Failed to vote.");
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!address) {
      toast.error("Please connect your wallet to execute.");
      return;
    }

    try {
      setExecuting(true);
      const tx = await contract.executeProposal(proposalId);
      await tx.wait();
      const reciept = await tx.wait();
      if (reciept.status === 1) {
        toast.success("Proposal Executed successfully");
        return;
      }
    } catch (error) {
      console.error("Error executing the proposal:", error);
      toast.error("Failed to execute proposal.");
    } finally {
      setExecuting(false); // Reset executing state
    }
  };

  const isExpired = new Date(Number(deadline) * 1000) < new Date();
  const canExecute = !executed && Number(votecount) >= Number(minRequiredVote);

  return (
    <Box className="bg-slate-400 rounded-md shadow-sm p-4 w-96">
      <Text className="text-2xl mb-4">Proposals</Text>
      <Box className="w-full">
        <Flex className="flex gap-4">
          <Text>Description:</Text>
          <Text className="font-bold">{description}</Text>
        </Flex>
        <Flex className="flex gap-4">
          <Text>Amount:</Text>
          <Text className="font-bold">{formatEther(amount)} ETH</Text>
        </Flex>
        <Flex className="flex gap-4">
          <Text>Required Vote:</Text>
          <Text className="font-bold">{Number(minRequiredVote)}</Text>
        </Flex>
        <Flex className="flex gap-4">
          <Text>Vote Count:</Text>
          <Text className="font-bold">{Number(votecount)}</Text>
        </Flex>
        <Flex className="flex gap-4">
          <Text>Deadline:</Text>
          <Text className="font-bold">
            {new Date(Number(deadline) * 1000).toLocaleString()}
          </Text>
        </Flex>
        <Flex className="flex gap-4">
          <Text>Executed:</Text>
          <Text className="font-bold">{String(executed)}</Text>
        </Flex>
      </Box>
      <Button
        onClick={
          isExpired ? null : canExecute ? handleExecute : handleUserVoting
        }
        className={`bg-blue-500 text-white font-bold w-full mt-4 p-4 rounded-md shadow-sm ${
          isExpired ? "bg-gray-500" : canExecute ? "bg-green-700" : ""
        }`}
      >
        {isExpired
          ? "Expired"
          : canExecute
          ? executing // Show "Executing..." if executing
            ? "Executing..."
            : "Execute"
          : loading && canExecute
          ? "Executing..."
          : loading
          ? "Voting..."
          : "Vote"}
      </Button>
    </Box>
  );
};

export default Proposal;
