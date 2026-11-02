# Requirements

## Functional

| ID  | Requirement                                                                         | Sprint |
| --- | ----------------------------------------------------------------------------------- | ------ |
| F-1 | Upload one weekly shift-close `.xlsx` (max 4 MB).                                   | 2      |
| F-2 | Reject the file only if it is unreadable or a required column is missing.           | 2      |
| F-3 | Process everything else, showing every excluded or merged row as a visible warning. | 2      |
| F-4 | Compute SB effectiveness per cashier from consolidated weekly totals.               | 3      |
| F-5 | Offer three views: Almirante, Barranqueras, both branches.                          | 3–4    |
| F-6 | Rank cashiers and show a top-3 podium per view, with ineligibility reasons.         | 3–4    |
| F-7 | Export the selected view to PDF and Excel.                                          | 5      |
| F-8 | Show whether the server is reachable, with a retry action when it is not.           | 1      |

## Non-functional

| ID   | Requirement                                                                   |
| ---- | ----------------------------------------------------------------------------- |
| NF-1 | Works fully offline: no CDN fonts, scripts, or styles at runtime.             |
| NF-2 | Reachable only from the same computer (binds `127.0.0.1`).                    |
| NF-3 | One command to run (`pnpm start`) and one URL (`http://127.0.0.1:3001`).      |
| NF-4 | No data is persisted: the uploaded file lives in memory for one request only. |
| NF-5 | Errors never expose stack traces or internal messages to the browser.         |
| NF-6 | No real employee names in the repository; tests use anonymized fixtures.      |
| NF-7 | UI copy in neutral professional Spanish.                                      |

## Sprint 1 acceptance

- [ ] `pnpm install && pnpm dev` starts both services and the UI shows "Conectado al servidor".
- [ ] With the API down, the UI shows a clear error and a retry button.
- [ ] `pnpm start` serves the app at `http://127.0.0.1:3001`, offline.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` pass.
