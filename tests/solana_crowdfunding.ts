import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";



describe("Crowdfunding Program", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.Crowdfunding as Program<any>;

  // Test accounts
  const campaign = Keypair.generate();
  const creator = provider.wallet.publicKey;

  it("Creates a new campaign", async () => {
    const title = "Save the Whales";
    const goal = new anchor.BN(1_000_000_000); // 1 SOL in lamports

    // Call the createCampaign function
    await program.methods
      .createCampaign(title, goal)
      .accounts({
        campaign: campaign.publicKey,
        creator,
        systemProgram: SystemProgram.programId,
      })
      .signers([campaign])
      .rpc();

    // Fetch the campaign account
    const campaignAccount = await program.account.campaign.fetch(campaign.publicKey);

    // Assertions
    assert.equal(campaignAccount.title, title);
    assert.equal(campaignAccount.goal.toString(), goal.toString());
    assert.equal(campaignAccount.amountRaised.toString(), "0");
    assert.equal(campaignAccount.isActive, true);
    assert.equal(campaignAccount.owner.toString(), creator.toString());

    console.log("Campaign created successfully:", campaign.publicKey.toBase58());
  });

  it("Contributes to the campaign", async () => {
    const contribution = new anchor.BN(500_000_000); // 0.5 SOL in lamports

    // Call the contribute function
    await program.methods
      .contribute(contribution)
      .accounts({
        campaign: campaign.publicKey,
        contributor: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Fetch the campaign account
    const campaignAccount = await program.account.campaign.fetch(campaign.publicKey);

    // Assertions
    assert.equal(campaignAccount.amountRaised.toString(), contribution.toString());

    console.log("Contributed successfully to campaign:", campaign.publicKey.toBase58());
  });

  it("Fails to withdraw funds if the goal is not met", async () => {
    try {
      await program.methods
        .withdraw()
        .accounts({
          campaign: campaign.publicKey,
          creator,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      assert.fail("Withdraw should fail if the goal is not met");
    } catch (err) {
      assert.include(err.toString(), "GoalNotReached");
    }
  });

  it("Withdraws funds after the goal is met", async () => {
    const additionalContribution = new anchor.BN(500_000_000); // 0.5 SOL in lamports

    // Contribute more to meet the goal
    await program.methods
      .contribute(additionalContribution)
      .accounts({
        campaign: campaign.publicKey,
        contributor: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Withdraw funds
    await program.methods
      .withdraw()
      .accounts({
        campaign: campaign.publicKey,
        creator,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Fetch the campaign account
    const campaignAccount = await program.account.campaign.fetch(campaign.publicKey);

    // Assertions
    assert.equal(campaignAccount.isActive, false);

    console.log("Funds withdrawn successfully from campaign:", campaign.publicKey.toBase58());
  });
});
