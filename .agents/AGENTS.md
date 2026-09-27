# FinWise AI Project Rules

## Permanent Record Management Rule for All Modules

From this point forward, whenever a FinWise AI module contains user-created records, the module MUST support full record management:

- **Create**: Add new user records
- **View / Read**: List and inspect user records with filtering/search
- **Edit**: Modify existing user-created record fields
- **Delete / Archive**: Delete or safely deactivate/archive records

### Modules Included
This rule applies to all present and future modules:
1. Expenses
2. Budgets
3. Income
4. Financial Accounts
5. Savings
6. Goals
7. Investments
8. Transactions

### Implementation Guidelines
- **Dual Enforcement**: Every Edit and Delete operation must be implemented in both the **Frontend UI** and **Backend REST API / Database**.
- **User Isolation**: All GET, POST, PATCH, DELETE operations MUST be scoped to the authenticated user ID (`userId = authenticatedUser.id`).
- **Data Integrity**: Deleting a record in one module (e.g. Budget) MUST NEVER delete financial transaction history (e.g. Expenses) unless explicitly specified.
