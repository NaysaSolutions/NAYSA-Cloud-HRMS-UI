# System Generated SQL procedure

These scripts are prepared for review; they have not been applied to the database.

Run in this order in the intended HRMS database:

1. `001_SystemGenerated_header_keys.sql`
2. `sproc_PHP_Tran_SystemGenerated.sql`

The live `TRN_SG_HD` schema and screenshot do not contain `SG_ID` or `SG_NO`. The first script adds them as `nvarchar(50)` and `nvarchar(10)` and creates unique indexes. It stops if either key is missing and either SG table already contains records: existing header/detail relationships need a reviewed backfill rather than guessed identifiers. It does not change existing transaction data.

The procedure retains the supplied reference lookups, employee selection, GL lookup, List, History, Get, Save, Post, Cancel, and payroll preparation modes. Table and transaction names become SG. `PreparePayrunSG` also accepts the original `PreparePayrunOED` mode as an alias. History returns `SG_Summary` and `SG_Details`.

Storage mapping:

| JSON | SQL |
| --- | --- |
| `sgId`, `sgNo`, `sgDate` | `SG_ID`, `SG_NO`, `SG_DATE` |
| `cutoffFrequency`, `cutoffCode` | `CUTOFF_FREQ`, `CUTOFF_CODE` |
| row `edCode`, `edName` | `ED_CODE`, `ED_NAME` (name comes from `REF_ED`) |
| row `amount` | `AMOUNT` |
| row `frequency` (or `edFreq`) | `ED_FREQ` (`S`, `M`, `W`) |
| row `holdFlag` | `HOLD_FLAG` (`Y`/`N`, default `N`) |

`cutoffFrequency` describes the payroll cutoff (such as `S1`); row `frequency` describes the earning/deduction schedule (such as `S`). They are separate fields.

The header has no `ED_TYPE`; categories come from `REF_ED`. An optional `edType` filter still supports `EARN` and `DED`. OED-only hours, rates, references and detail remarks are not read or written. Payroll output retains the original response keys, with unavailable hours/rates/reference values returned as `NULL`. Payroll transaction type and remarks come from the header. The assumed hold convention is `HOLD_FLAG = Y` excludes a row unless `includeNotForPayroll` is enabled; returned `payregFlag` is its inverse. Confirm this convention against your payroll rules before deployment.

Document numbers use `SG` plus eight digits, fitting `SG_NO nvarchar(10)`. Document status retains the original procedure's `D` (Open), `F` (Finalized), and `X` (Cancelled). Saves use a separate `TRN_SG_SAVE` application lock and a transaction.

Example payload (replace cutoff and employee/code values with valid reference records):

```sql
EXEC dbo.sproc_PHP_Tran_SystemGenerated
    @mode = N'Save',
    @params = N'{"jsonData":{
      "sgDate":"2026-11-02",
      "cutoffType":"M",
      "cutoffFrequency":"M",
      "cutoffCode":"REPLACE",
      "cutoffStartDate":"2026-11-01",
      "cutoffEndDate":"2026-11-30",
      "tranType":"Regular",
      "remarks":"System Generated transaction",
      "userCode":"ADMIN",
      "rows":[{
        "lineNo":1,"empNo":"REPLACE","edCode":"REPLACE",
        "startDate":"2026-11-01","endDate":"2026-11-30",
        "amount":1000.00,"frequency":"M","holdFlag":"N"
      }]
    }}';
```

Save returns `sgId`, `sgNo`, and `message`; errors retain `errorMsg`, `errorNumber`, and `errorCount`. Use the returned `sgId` with Get, Post, or Cancel. Cancel also requires `remarks`; Post/Cancel require `userCode`.

The API now includes `app/Http/Controllers/SystemGeneratedController.php`, which calls this procedure using bound SQL parameters and the `jsonData` wrapper. Routes under `/api/systemGeneratedTransactions` use the existing tenant middleware:

| Method | Endpoint | Procedure mode |
| --- | --- | --- |
| GET | `/selectionReferences` | SelectionReferences |
| POST | `/selectionEmployees` | SelectionEmployees |
| POST | `/list` | List |
| POST | `/history` | History |
| POST | `/get` | Get |
| POST | `/save` | Save |
| POST | `/post` | Post |
| POST | `/cancel` | Cancel (also requires posting credentials) |
| POST | `/loadED` | LoadED |
| POST | `/loadEDGL` | LoadEDGL |
| POST | `/preparePayrun` | PreparePayrunSG |

History also accepts the existing report component's `json_data` wrapper/string format. Procedure business errors return HTTP 422 with `success: false`, `message`, and the original procedure `data`; SQL/runtime failures return HTTP 500. Successful requests retain the standard `success`/`data` envelope.

`SystemGenerated.jsx` now uses `/systemGeneratedTransactions` for Save, Get, Post, Cancel and History. SG-specific lookup components use its SelectionReferences and SelectionEmployees endpoints. Save sends `sgId`, `sgDate`, row `edCode`, `amount`, `frequency`, and `holdFlag`; header Amount/Frequency remain bulk-entry controls rather than stored header columns. History uses `SG_Summary`/`SG_Details`, and saved Open (`D`) transactions remain editable. Printing/attachments use SG document IDs and document type `SG`, so their shared backend/report configuration must support that document type.

Read-only local API checks against tenant NS2 succeeded for SelectionReferences, List, History, and SelectionEmployees after wiring the UI. No Save, Post, or Cancel requests were executed during verification. Mock-free payload/response tests can be run with `node --test tests/systemGenerated.test.mjs` in the UI repository.
