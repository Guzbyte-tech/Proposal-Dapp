import useContract from "./useContract";
import { toast } from "react-toastify";
import { useAppKitAccount } from "@reown/appkit/react";
import { useCallback, useState } from "react";

const useVote = () => {

  const contract = useContract(true);
  const { address } = useAppKitAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


  const voteOnProposal = useCallback(async (proposalId, executed) => {
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
      setError(null);

      const tx = await contract.vote(proposalId);
      await tx.wait();
  
      const updatedProposal = await contract.proposals(proposalId);
    //   const newVoteCount = Number(updatedProposal.voteCount);

      setLoading(false);
    //   toast.success("Vote submitted successfully!");

      return updatedProposal; 
  
    //   updateVoteCount(proposalId, newVoteCount);
  
      
    } catch (error) {
      console.error("Error voting on the proposal:", error);
      toast.error("Failed to vote.");
    } finally {
      setLoading(false);
    }
  }, [address, contract]) 

  return { voteOnProposal, loading, error };

  


};


export default useVote;
