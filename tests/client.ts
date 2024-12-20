import * as anchor from "@project-serum/anchor";
import { Program, web3 } from "@project-serum/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";

// Define the program ID and workspace
const PROGRAM_ID = "111111111111111111";
const IDL = require("../../target/idl/solana_crowdfunding.json";
); // Replace with your IDL file
const connection = new web3.Connection(web3.clusterApiUrl("devnet"), "processed");

// Set up the provider (wallet and connection)
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

// Load the program
const program = new anchor.Program(IDL, PROGRAM_ID, provider);

// Helper function to create a campaign
export const createCampaign = async (title: string, goal: number): Promise<PublicKey> => {
    // Generate a new keypair for the campaign account
    const campaign = web3.Keypair.generate();

    // Execute the RPC call
    await program.methods
        .createCampaign(title, new anchor.BN(goal))
        .accounts({
            campaign: campaign.publicKey,
            creator: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
        })
        .signers([campaign])
        .rpc();

    console.log(`Campaign created with public key: ${campaign.publicKey}`);
    return campaign.publicKey;
};

// Helper function to contribute to a campaign
export const contribute = async (campaignPubkey: PublicKey, amount: number): Promise<void> => {
    await program.methods
        .contribute(new anchor.BN(amount))
        .accounts({
            campaign: campaignPubkey,
            contributor: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
        })
        .rpc();

    console.log(`Contributed ${amount} lamports to campaign: ${campaignPubkey}`);
};

// Helper function to withdraw funds from a campaign
export const withdraw = async (campaignPubkey: PublicKey): Promise<void> => {
    await program.methods
        .withdraw()
        .accounts({
            campaign: campaignPubkey,
            creator: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
        })
        .rpc();

    console.log(`Withdrawn funds from campaign: ${campaignPubkey}`);
};

// Example usage
(async () => {
    try {
        // Create a campaign
        const campaignPubkey = await createCampaign("Save the Whales", 1000000000); // 1 SOL in lamports

        // Contribute to the campaign
        await contribute(campaignPubkey, 500000000); // Contribute 0.5 SOL in lamports

        // Withdraw funds (only works after the goal is reached)
        await withdraw(campaignPubkey);
    } catch (err) {
        console.error("Error:", err);
    }
})();
