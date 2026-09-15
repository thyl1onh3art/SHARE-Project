import {
  HOME_ACCOUNT_PREVIEW_LIMIT,
  HOME_ATTENTION_LIMIT,
  buildHomeAccountSummaries,
  buildHomeAttentionItems,
  homeProgressPercent,
  homeProgressText,
  isPendingReceivedInvite,
  previewHomeAccounts,
  sortHomeAccounts
} from './homeDashboard';

const owner = { _id: 'user-1', firstName: 'Sam' };
const other = { _id: 'user-2', firstName: 'Alex' };

describe('home dashboard helpers', () => {
  it('clamps progress between 0 and 100 and keeps funded/target text', () => {
    expect(homeProgressPercent(0, 100)).toBe(0);
    expect(homeProgressPercent(40, 100)).toBe(40);
    expect(homeProgressPercent(150, 100)).toBe(100);
    expect(homeProgressPercent(20, null)).toBe(0);
    expect(homeProgressText(200, 500)).toBe('£200 of £500');
    expect(homeProgressText(40, null)).toBe('£40');
  });

  it('skips archived accounts and prefers action then soonest goal date', () => {
    const summaries = buildHomeAccountSummaries({
      userId: 'user-1',
      payments: [],
      events: [],
      accounts: [
        {
          _id: 'closed-1',
          name: 'Closed ski trip',
          isDeleted: true,
          targetAmount: 100,
          owner,
          members: [],
          financeRecords: []
        },
        {
          _id: 'later',
          name: 'Zebra fund',
          targetAmount: 100,
          targetDate: '2028-12-01',
          owner,
          members: [],
          financeRecords: [{ type: 'input', amount: 10 }]
        },
        {
          _id: 'sooner',
          name: 'Alpha fund',
          targetAmount: 100,
          targetDate: '2027-01-01',
          owner,
          members: [],
          financeRecords: [{ type: 'input', amount: 10 }]
        },
        {
          _id: 'ready',
          name: 'Ready fund',
          targetAmount: 100,
          targetDate: '2029-01-01',
          owner,
          members: [],
          financeRecords: [{ type: 'input', amount: 100 }]
        }
      ]
    });

    expect(summaries.map((account) => account.id)).toEqual(['later', 'sooner', 'ready']);
    expect(sortHomeAccounts(summaries).map((account) => account.id)).toEqual(['ready', 'sooner', 'later']);
    expect(previewHomeAccounts(summaries)).toHaveLength(Math.min(3, HOME_ACCOUNT_PREVIEW_LIMIT));
  });

  it('limits the Home preview to a small number of accounts', () => {
    const summaries = buildHomeAccountSummaries({
      userId: 'user-1',
      payments: [],
      events: [],
      accounts: [1, 2, 3, 4, 5, 6].map((n) => ({
        _id: `pot-${n}`,
        name: `Fund ${n}`,
        targetAmount: 100,
        targetDate: `2028-0${n}-01`,
        owner,
        members: [],
        financeRecords: [{ type: 'input', amount: 10 }]
      }))
    });

    expect(summaries).toHaveLength(6);
    expect(previewHomeAccounts(summaries)).toHaveLength(HOME_ACCOUNT_PREVIEW_LIMIT);
  });

  it('does not create attention items when nothing needs action', () => {
    const accounts = buildHomeAccountSummaries({
      userId: 'user-1',
      payments: [],
      events: [],
      accounts: [{
        _id: 'pot-open',
        name: 'Open fund',
        targetAmount: 500,
        targetDate: '2027-06-01',
        owner,
        members: [],
        financeRecords: [{ type: 'input', amount: 50 }]
      }]
    });

    expect(buildHomeAttentionItems({
      accounts,
      invites: [{
        _id: 'sent',
        status: 'pending',
        recipientEmail: 'alex@example.com',
        expiresAt: '2028-01-01',
        sharedAccount: { name: 'Open fund' }
      }],
      userEmail: 'sam@example.com'
    })).toEqual([]);
  });

  it('builds invitation, approval, pay-now, close, and plan attention items', () => {
    const accounts = buildHomeAccountSummaries({
      userId: 'user-1',
      events: [],
      payments: [
        {
          _id: 'pr-pending',
          status: 'pending',
          sharedAccount: { _id: 'pot-approve', name: 'Task 20 group account' },
          requestedBy: other,
          approvals: [],
          rejections: []
        },
        {
          _id: 'pr-done',
          status: 'executed',
          sharedAccount: { _id: 'pot-close', name: 'Holiday fund' },
          requestedBy: owner
        }
      ],
      accounts: [
        {
          _id: 'pot-approve',
          name: 'Task 20 group account',
          targetAmount: 200,
          owner,
          members: [other],
          financeRecords: [{ type: 'input', amount: 200 }]
        },
        {
          _id: 'pot-pay',
          name: 'Ready to pay fund',
          targetAmount: 80,
          owner,
          members: [],
          financeRecords: [{ type: 'input', amount: 80 }]
        },
        {
          _id: 'pot-close',
          name: 'Holiday fund',
          targetAmount: 90,
          owner,
          members: [],
          financeRecords: [{ type: 'input', amount: 90 }]
        },
        {
          _id: 'pot-plan',
          name: 'Member plan fund',
          targetAmount: 120,
          owner: other,
          members: [owner],
          financeRecords: [{ type: 'input', amount: 10 }],
          contributionPlans: []
        }
      ]
    });

    const items = buildHomeAttentionItems({
      accounts,
      userEmail: 'sam@example.com',
      now: new Date('2026-09-14T12:00:00'),
      invites: [{
        _id: 'inv-1',
        status: 'pending',
        recipientEmail: 'sam@example.com',
        expiresAt: '2028-01-01',
        sharedAccount: { name: 'Weekend fund' }
      }]
    });

    expect(items[0]).toMatchObject({
      kind: 'invitation',
      title: 'Invitation to join',
      accountName: 'Weekend fund',
      to: '/invitations'
    });
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'payment_approval',
        title: 'Payment approval needed',
        accountName: 'Task 20 group account',
        to: '/shared-accounts/pot-approve'
      }),
      expect.objectContaining({
        kind: 'pay_now',
        title: 'Shared Account ready to pay',
        accountName: 'Ready to pay fund',
        to: '/shared-accounts/pot-pay?pay=now'
      }),
      expect.objectContaining({
        kind: 'close_account',
        title: 'Payment completed',
        accountName: 'Holiday fund',
        to: '/shared-accounts/pot-close?close=now'
      }),
      expect.objectContaining({
        kind: 'setup_plan',
        title: 'Set up your contribution plan',
        accountName: 'Member plan fund',
        to: '/shared-accounts/pot-plan?setupPlan=1'
      })
    ]));
    expect(items.length).toBeLessThanOrEqual(HOME_ATTENTION_LIMIT);

    const byId = Object.fromEntries(accounts.map((account) => [account.id, account]));
    expect(byId['pot-approve'].viewerRole).toBe('organiser');
    expect(byId['pot-plan'].viewerRole).toBe('shared');
    expect(byId['pot-plan'].isOrganiser).toBe(false);
  });

  it('ignores expired and unmatched invitations', () => {
    expect(isPendingReceivedInvite({
      status: 'pending',
      recipientEmail: 'sam@example.com',
      expiresAt: '2020-01-01'
    }, 'sam@example.com', new Date('2026-09-14'))).toBe(false);

    expect(isPendingReceivedInvite({
      status: 'accepted',
      recipientEmail: 'sam@example.com',
      expiresAt: '2028-01-01'
    }, 'sam@example.com')).toBe(false);
  });

  it('uses Shared Account ownership after transfer even if tripMoney owner is stale', () => {
    const summaries = buildHomeAccountSummaries({
      userId: 'user-1',
      payments: [],
      events: [{
        title: 'Canada Holiday',
        tripMoney: {
          _id: 'pot-canada',
          name: 'Canada Holiday',
          owner,
          isDeleted: false
        }
      }],
      accounts: [{
        _id: 'pot-canada',
        name: 'Canada Holiday',
        targetAmount: 500,
        owner: other,
        members: [owner],
        financeRecords: [{ type: 'input', amount: 50 }]
      }]
    });

    expect(summaries[0].viewerRole).toBe('shared');
    expect(summaries[0].isOrganiser).toBe(false);
  });

  it('gives the new owner Organiser after transfer', () => {
    const summaries = buildHomeAccountSummaries({
      userId: 'user-2',
      payments: [],
      events: [],
      accounts: [{
        _id: 'pot-canada',
        name: 'Canada Holiday',
        targetAmount: 500,
        owner: other,
        members: [owner],
        financeRecords: []
      }]
    });

    expect(summaries[0].viewerRole).toBe('organiser');
    expect(summaries[0].isOrganiser).toBe(true);
  });
});
