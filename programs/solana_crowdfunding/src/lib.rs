use anchor_lang::prelude::*;
use solana_program::entrypoint::ProgramResult;

// This is your program's public key and it will update
// automatically when you build the project.
declare_id!("GPcFTGeadNHpEgJ2PUMDvrZY7j2pxthpyStTrJffzG7Z");

#[program]
pub mod crowdfunding {
    use super::*;

    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        title: String,
        goal: u64,
    ) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign;
        campaign.title = title;
        campaign.goal = goal;
        campaign.amount_raised = 0;
        campaign.is_active = true;
        campaign.owner = *ctx.accounts.creator.key; // Store creator's public key

        Ok(())
    }

    pub fn contribute(ctx: Context<Contributor>, amount: u64) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign;

        // Check if the campaign is still active
        require!(campaign.is_active, CustomError::CampaignAlreadyInactive);

        // Update the amount raised
        campaign.amount_raised += amount;

        // Transfer funds from contributor to campaign
        let cpi_accounts = anchor_lang::system_program::Transfer {
            from: ctx.accounts.contributor.to_account_info(),
            to: ctx.accounts.campaign.to_account_info(),
        };
        anchor_lang::system_program::transfer(
            CpiContext::new(ctx.accounts.system_program.to_account_info(), cpi_accounts),
            amount,
        )?;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign;

        // Ensure the campaign is still active and the goal has been reached
        require!(campaign.is_active, CustomError::CampaignAlreadyInactive);
        require!(
            campaign.amount_raised >= campaign.goal,
            CustomError::GoalNotReached
        );

        // Ensure the withdrawer is the owner of the campaign
        require!(
            ctx.accounts.creator.key() == campaign.owner,
            CustomError::UnauthorizedAccess
        );

        // Transfer funds to the campaign creator
        let cpi_accounts = anchor_lang::system_program::Transfer {
            from: ctx.accounts.campaign.to_account_info(),
            to: ctx.accounts.creator.to_account_info(),
        };
        anchor_lang::system_program::transfer(
            CpiContext::new(ctx.accounts.system_program.to_account_info(), cpi_accounts),
            campaign.amount_raised,
        )?;

        // Mark the campaign as inactive
        campaign.is_active = false;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateCampaign<'info> {
    #[account(
        init, 
        payer = creator, 
        space = 8 + 4 + title.len() + 4 + 8 + 8 + 1 + 32 // Adjusted for title and Pubkey
    )]
    pub campaign: Account<'info, Campaign>,
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Contributor<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    pub contributor: Signer<'info>,
    pub system_program: Program<'info, System>, // Added to support transfer
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>, // Added to support transfer
}

#[account]
pub struct Campaign {
    pub title: String,
    pub goal: u64,
    pub amount_raised: u64,
    pub is_active: bool,
    pub owner: Pubkey, // Store the public key of the creator
}

#[error_code]
pub enum CustomError {
    #[msg("The fundraising goal has not been reached yet")]
    GoalNotReached,
    #[msg("The campaign is already inactive")]
    CampaignAlreadyInactive,
    #[msg("Unauthorized access")]
    UnauthorizedAccess,
}
