-- Run 001_SystemGenerated_header_keys.sql first.
-- Adapted from the supplied sproc_PHP_Tran_OtherEarningsDeductions.
-- JSON contract: sgId, sgNo, sgDate; rows: edCode, amount, frequency, holdFlag.
-- Category is derived from REF_ED. HOLD_FLAG=Y excludes a row from payroll by default.
-- SG document numbers use SG + eight digits (nvarchar(10)). Open=D, Finalized=F, Cancelled=X.
-- This script defines the procedure only; it does not execute transaction modes.
CREATE OR ALTER PROCEDURE [dbo].[sproc_PHP_Tran_SystemGenerated]
    @mode   nvarchar(30),
    @params nvarchar(max) = null
as
begin
    set nocount on;
    set xact_abort on;

    declare
        @sgId            nvarchar(50),
        @sgNo            nvarchar(10),
        @sgDate          date,
        @cutoffType       nvarchar(10),
        @cutoffFrequency  nvarchar(50),
        @cutoffCode       nvarchar(8),
        @cutoffStartDate  date,
        @cutoffEndDate    date,
        @tranType         nvarchar(50),
        @edType           nvarchar(10),
        @remarks          nvarchar(4000),
        @refOt            nvarchar(100),
        @refLv            nvarchar(100),
        @refTs            nvarchar(100),
        @genCode          nvarchar(1),
        @userCode         nvarchar(100),
        @branchCode       nvarchar(30),
        @groupCode        nvarchar(30),
        @clientCode       nvarchar(30),
        @deptCode         nvarchar(30),
        @employeeStatus   nvarchar(30),
        @positionCode     nvarchar(30),
        @employeeNo       nvarchar(30),
        @payFrequency     nvarchar(10),
        @search           nvarchar(200),
        @startDate        date,
        @endDate          date,
        @rows             nvarchar(max),
        @result           nvarchar(max),
        @currentDate      datetime,
        @lockResult       int,
        @nextNo           bigint;

    begin try
        if @mode is null or @mode not in
        (
            'SelectionReferences', 'SelectionEmployees',
            'List', 'History', 'Get', 'Save', 'Post', 'Cancel',
            'LoadED', 'LoadEDGL', 'PreparePayrunSG', 'PreparePayrunOED'
        )
            throw 50001, 'Unsupported System Generated mode.', 1;

        if @params is not null and isjson(@params) <> 1
            throw 50001, 'A valid JSON object is required.', 1;

        if len(json_value(@params, '$.jsonData.sgId')) > 50
           or len(json_value(@params, '$.jsonData.sgNo')) > 10
           or len(json_value(@params, '$.jsonData.cutoffCode')) > 8
           or len(json_value(@params, '$.jsonData.cutoffFrequency')) > 50
           or len(json_value(@params, '$.jsonData.genCode')) > 1
           or len(json_value(@params, '$.jsonData.userCode')) > 100
            throw 50001, 'A header value exceeds its SG column length.', 1;

        select @sgId           = nullif(ltrim(rtrim(json_value(@params, '$.jsonData.sgId'))), ''),
               @sgNo           = nullif(ltrim(rtrim(json_value(@params, '$.jsonData.sgNo'))), ''),
               @sgDate         = try_convert(date, json_value(@params, '$.jsonData.sgDate')),
               @cutoffType      = nullif(upper(ltrim(rtrim(json_value(@params, '$.jsonData.cutoffType')))), ''),
               @cutoffFrequency = nullif(upper(ltrim(rtrim(json_value(@params, '$.jsonData.cutoffFrequency')))), ''),
               @cutoffCode      = nullif(ltrim(rtrim(json_value(@params, '$.jsonData.cutoffCode'))), ''),
               @cutoffStartDate = try_convert(date, json_value(@params, '$.jsonData.cutoffStartDate')),
               @cutoffEndDate   = try_convert(date, json_value(@params, '$.jsonData.cutoffEndDate')),
               @tranType        = nullif(ltrim(rtrim(json_value(@params, '$.jsonData.tranType'))), ''),
               @edType          = nullif(upper(ltrim(rtrim(json_value(@params, '$.jsonData.edType')))), ''),
               @remarks         = nullif(ltrim(rtrim(json_value(@params, '$.jsonData.remarks'))), ''),
               @refOt           = nullif(ltrim(rtrim(json_value(@params, '$.jsonData.refOt'))), ''),
               @refLv           = nullif(ltrim(rtrim(json_value(@params, '$.jsonData.refLv'))), ''),
               @refTs           = nullif(ltrim(rtrim(json_value(@params, '$.jsonData.refTs'))), ''),
               @genCode         = nullif(ltrim(rtrim(json_value(@params, '$.jsonData.genCode'))), ''),
               @userCode        = nullif(ltrim(rtrim(json_value(@params, '$.jsonData.userCode'))), ''),
               @branchCode      = nullif(ltrim(rtrim(json_value(@params, '$.jsonData.branchCode'))), ''),
               @groupCode       = nullif(ltrim(rtrim(json_value(@params, '$.jsonData.groupCode'))), ''),
               @clientCode      = nullif(ltrim(rtrim(json_value(@params, '$.jsonData.clientCode'))), ''),
               @deptCode        = nullif(ltrim(rtrim(json_value(@params, '$.jsonData.deptCode'))), ''),
               @employeeStatus  = coalesce
                                  (
                                      nullif(ltrim(rtrim(json_value(@params, '$.jsonData.statCode'))), ''),
                                      nullif(ltrim(rtrim(json_value(@params, '$.jsonData.employeeStatus'))), '')
                                  ),
               @positionCode    = coalesce
                                  (
                                      nullif(ltrim(rtrim(json_value(@params, '$.jsonData.posCode'))), ''),
                                      nullif(ltrim(rtrim(json_value(@params, '$.jsonData.positionCode'))), '')
                                  ),
               @employeeNo      = coalesce
                                  (
                                      nullif(ltrim(rtrim(json_value(@params, '$.jsonData.empNo'))), ''),
                                      nullif(ltrim(rtrim(json_value(@params, '$.jsonData.employeeNo'))), '')
                                  ),
               @payFrequency    = nullif(upper(ltrim(rtrim(json_value(@params, '$.jsonData.payFrequency')))), ''),
               @search          = nullif(ltrim(rtrim(json_value(@params, '$.jsonData.search'))), ''),
               @startDate       = try_convert(date, json_value(@params, '$.jsonData.startDate')),
               @endDate         = try_convert(date, json_value(@params, '$.jsonData.endDate')),
               @rows            = json_query(@params, '$.jsonData.rows');

        /* -----------------------------------------------------------------
           SelectionReferences - header lookups and REF_ED catalog
           ----------------------------------------------------------------- */
        if @mode = 'SelectionReferences'
        begin
            select @result =
            (
                select json_query(isnull
                       (
                           (
                               select branch.branch_code as value,
                                      branch.branch_name as label
                               from dbo.ref_branch as branch
                               order by branch.branch_code
                               for json path
                           ), '[]'
                       )) as branches,
                       json_query(isnull
                       (
                           (
                               select payGroup.group_code as value,
                                      payGroup.group_name as label
                               from dbo.ref_paygroup as payGroup
                               order by payGroup.group_code
                               for json path
                           ), '[]'
                       )) as payGroups,
                       json_query(isnull
                       (
                           (
                               select dept.dept_code as value,
                                      dept.dept_name as label
                               from dbo.ref_dept as dept
                               order by dept.dept_code
                               for json path
                           ), '[]'
                       )) as departments,
                       json_query(isnull
                       (
                           (
                               select client.client_code as value,
                                      client.client_name as label
                               from dbo.ref_client as client
                               order by client.client_code
                               for json path
                           ), '[]'
                       )) as clients,
                       json_query(isnull
                       (
                           (
                               select stat.stat_code as value,
                                      stat.stat_name as label
                               from dbo.ref_empstat as stat
                               order by stat.stat_code
                               for json path
                           ), '[]'
                       )) as statuses,
                       json_query(isnull
                       (
                           (
                               select pos.pos_code as value,
                                      pos.pos_name as label
                               from dbo.ref_pos as pos
                               order by pos.pos_code
                               for json path
                           ), '[]'
                       )) as positions,
                       json_query(isnull
                       (
                           (
                               select ed.ed_code         as edCode,
                                      ed.ed_name         as edName,
                                      ed.ed_type         as edType,
                                      isnull(ed.code, '') as code,
                                      isnull(ed.active, 'Y') as active
                               from dbo.ref_ed as ed
                               where upper(isnull(ed.active, 'Y')) in ('Y', '1', 'TRUE', 'A')
                               order by ed.[order], ed.ed_code
                               for json path, include_null_values
                           ), '[]'
                       )) as edCodes,
                       json_query(isnull
                       (
                           (
                               select cutoff.cutoff_code      as value,
                                      cutoff.cutoff_name      as label,
                                      cutoff.cutoff_code      as cutoffCode,
                                      cutoff.cutoff_name      as cutoffName,
                                      cutoff.cutoff_type      as cutoffType,
                                      cutoff.cutoff_freq      as cutoffFrequency,
                                      cutoff.cutoff_startdate as startDate,
                                      cutoff.cutoff_enddate   as endDate
                               from dbo.ref_cutoff as cutoff
                               order by cutoff.cutoff_startdate desc, cutoff.cutoff_code desc
                               for json path, include_null_values
                           ), '[]'
                       )) as cutoffs
                for json path, without_array_wrapper
            );

            select isnull(@result, '{"branches":[],"payGroups":[],"departments":[],"clients":[],"statuses":[],"positions":[],"edCodes":[],"cutoffs":[]}') as result;
            return;
        end;

        /* -----------------------------------------------------------------
           SelectionEmployees - same six filters as Overtime
           ----------------------------------------------------------------- */
        if @mode = 'SelectionEmployees'
        begin
            if @payFrequency not in ('S', 'M', 'W')
                throw 50001, 'Payroll frequency S, M, or W is required.', 1;

            if @cutoffCode is null
                throw 50001, 'Payroll Cut-Off is required.', 1;

            if not exists
            (
                select 1
                from dbo.ref_cutoff as cutoff
                where cutoff.cutoff_code = @cutoffCode
                  and cutoff.cutoff_type = @payFrequency
            )
                throw 50001, 'Payroll Cut-Off does not match the selected pay frequency.', 1;

            select @result =
            (
                select employee.emp_no               as empNo,
                       employee.emp_name             as empName,
                       employee.pay_freq             as payFrequency,
                       employee.comp_code            as compCode,
                       employee.branch_code          as branchCode,
                       branch.branch_name            as branchName,
                       employee.client_code          as clientCode,
                       client.client_name            as clientName,
                       employee.group_code           as groupCode,
                       payGroup.group_name           as groupName,
                       employee.dept_code            as deptCode,
                       dept.dept_name                as deptName,
                       employee.pos_code             as posCode,
                       pos.pos_name                  as posName,
                       employee.stat_code            as statCode,
                       stat.stat_name                as statName,
                       employee.sg_code              as sgCode,
                       employee.shift_code           as shiftCode,
                       isnull(employee.daily_rate, 0) as dailyRate,
                       isnull(employee.hour_rate, 0)  as hourRate
                from dbo.refmast_employee as employee
                inner join dbo.ref_branch as branch
                    on branch.branch_code = employee.branch_code
                inner join dbo.ref_paygroup as payGroup
                    on payGroup.group_code = employee.group_code
                left join dbo.ref_client as client
                    on client.client_code = employee.client_code
                left join dbo.ref_dept as dept
                    on dept.dept_code = employee.dept_code
                left join dbo.ref_pos as pos
                    on pos.pos_code = employee.pos_code
                left join dbo.ref_empstat as stat
                    on stat.stat_code = employee.stat_code
                where upper(ltrim(rtrim(employee.pay_freq))) = @payFrequency
                  and (@groupCode is null or employee.group_code = @groupCode)
                  and (@branchCode is null or employee.branch_code = @branchCode)
                  and (@clientCode is null or employee.client_code = @clientCode)
                  and (@deptCode is null or employee.dept_code = @deptCode)
                  and (@employeeStatus is null or employee.stat_code = @employeeStatus)
                  and (@positionCode is null or employee.pos_code = @positionCode)
                  and (@employeeNo is null or employee.emp_no = @employeeNo)
                  and
                  (
                      @search is null
                      or employee.emp_no like concat('%', @search, '%')
                      or employee.emp_name like concat('%', @search, '%')
                  )
                  and upper(isnull(employee.active, 'Y')) in ('Y', '1', 'TRUE', 'A')
                order by employee.emp_no
                for json path, include_null_values
            );

            select isnull(@result, '[]') as result;
            return;
        end;

        /* -----------------------------------------------------------------
           LoadED - legacy sproc_vbnet_load_paced, Cloud REF_ED
           ----------------------------------------------------------------- */
        if @mode = 'LoadED'
        begin
            declare
                @_loadEdCode   nvarchar(30),
                @_loadEdType   nvarchar(10),
                @_showInactive bit;

            select @_loadEdCode   = nullif(ltrim(rtrim(json_value(@params, '$.jsonData.edCode'))), ''),
                   @_loadEdType   = nullif(upper(ltrim(rtrim(json_value(@params, '$.jsonData.edType')))), ''),
                   @_showInactive = case
                                        when lower(isnull(json_value(@params, '$.jsonData.includeInactive'), 'false'))
                                             in ('true', '1', 'yes') then 1
                                        else 0
                                    end;

            select @result =
            (
                select ed.ed_code                      as edCode,
                       ed.ed_name                      as edName,
                       ed.ed_type                      as edType,
                       case ed.ed_type
                            when 'EARN' then 'Earnings'
                            when 'DED'  then 'Deductions'
                            else isnull(ed.ed_type, '')
                       end                             as edTypeName,
                       isnull(ed.code, '')             as code,
                       isnull(ed.ctrp, '')             as ctrp,
                       isnull(ed.deminimis, '')        as deminimis,
                       isnull(ed.taxable, '')          as taxable,
                       ed.[order]                      as sortOrder,
                       isnull(ed.comp_sss, '')         as compSss,
                       isnull(ed.comp_ph, '')          as compPh,
                       isnull(ed.comp_hdmf, '')        as compHdmf,
                       isnull(ed.include_mp13, '')     as includeMp13,
                       isnull(ed.include_bonexamt, '') as includeBonexamt,
                       isnull(ed.bonus_flag, '')       as bonusFlag,
                       isnull(ed.report_hdr, '')       as reportHdr,
                       isnull(ed.report_field, '')     as reportField,
                       ed.tax_2316                    as tax2316,
                       ed.ntax_2316                   as ntax2316,
                       isnull(ed.acct_code, '')        as acctCode,
                       isnull(ed.acct_name, '')        as acctName,
                       isnull(ed.active, 'Y')          as active
                from dbo.ref_ed as ed
                where (@_loadEdCode is null or ed.ed_code = @_loadEdCode)
                  and (@_loadEdType is null or ed.ed_type = @_loadEdType)
                  and
                  (
                      @_showInactive = 1
                      or upper(isnull(ed.active, 'Y')) in ('Y', '1', 'TRUE', 'A')
                  )
                order by ed.[order], ed.ed_code
                for json path, include_null_values
            );

            select isnull(@result, '[]') as result;
            return;
        end;

        /* -----------------------------------------------------------------
           LoadEDGL - legacy sproc_vbnet_load_paced_glmatch
           REF_ED has only one GL account, not separate DR/CR columns.
           ----------------------------------------------------------------- */
        if @mode = 'LoadEDGL'
        begin
            declare
                @_glEdCode nvarchar(30),
                @_glEdType nvarchar(10);

            select @_glEdCode = nullif(ltrim(rtrim(json_value(@params, '$.jsonData.edCode'))), ''),
                   @_glEdType = nullif(upper(ltrim(rtrim(json_value(@params, '$.jsonData.edType')))), '');

            select @result =
            (
                select ed.ed_code                  as edCode,
                       ed.ed_name                  as edName,
                       ed.ed_type                  as edType,
                       isnull(ed.acct_code, '')    as acctCode,
                       isnull(ed.acct_name, '')    as acctName,
                       cast(null as nvarchar(50)) as drAcct,
                       cast(null as nvarchar(200)) as drAcctName,
                       cast(null as nvarchar(50)) as crAcct,
                       cast(null as nvarchar(200)) as crAcctName,
                       isnull(ed.active, 'Y')      as active
                from dbo.ref_ed as ed
                where (@_glEdCode is null or ed.ed_code = @_glEdCode)
                  and (@_glEdType is null or ed.ed_type = @_glEdType)
                order by ed.ed_code
                for json path, include_null_values
            );

            select isnull(@result, '[]') as result;
            return;
        end;

        /* -----------------------------------------------------------------
           List - transaction list with employee counts and totals
           ----------------------------------------------------------------- */
        if @mode = 'List'
        begin
            select @result =
            (
                select header.sg_id            as sgId,
                       header.sg_no            as sgNo,
                       header.sg_no            as docNo,
                       header.sg_date          as sgDate,
                       cutoff.cutoff_type       as cutoffType,
                       header.cutoff_freq       as cutoffFrequency,
                       header.cutoff_code       as cutoffCode,
                       cutoff.cutoff_name       as cutoffName,
                       header.cutoff_startdate  as cutoffStartDate,
                       header.cutoff_enddate    as cutoffEndDate,
                       header.tran_type         as tranType,
                       header.remarks           as remarks,
                       header.doc_status        as documentStatus,
                       case header.doc_status
                            when 'F' then 'Finalized'
                            when 'X' then 'Cancelled'
                            else 'Open'
                       end                      as statusName,
                       count(distinct detail.emp_no) as employeeCount,
                       count(detail.sg_id)           as detailCount,
                       isnull(sum(detail.amount), 0)  as totalAmount
                from dbo.trn_sg_hd as header
                left join dbo.trn_sg_dt1 as detail
                    on detail.sg_id = header.sg_id
                left join dbo.ref_cutoff as cutoff
                    on cutoff.cutoff_code = header.cutoff_code
                where (@sgId is null or header.sg_id = @sgId)
                  and (@sgNo is null or header.sg_no = @sgNo)
                  and (@cutoffCode is null or header.cutoff_code = @cutoffCode)
                  and (@cutoffFrequency is null or header.cutoff_freq = @cutoffFrequency)
                  and (@edType is null or exists
                              (select 1 from dbo.trn_sg_dt1 as categoryDetail
                               inner join dbo.ref_ed as categoryED on categoryED.ed_code = categoryDetail.ed_code
                               where categoryDetail.sg_id = header.sg_id and categoryED.ed_type = @edType))
                group by header.sg_id, header.sg_no, header.sg_date,
                         cutoff.cutoff_type, header.cutoff_freq, header.cutoff_code,
                         cutoff.cutoff_name, header.cutoff_startdate, header.cutoff_enddate,
                         header.tran_type, header.remarks, header.doc_status
                order by header.sg_date desc, header.sg_no desc
                for json path, include_null_values
            );

            select isnull(@result, '[]') as result;
            return;
        end;

        /* -----------------------------------------------------------------
           History - shape required by AllTranHistory in the current JSX
           ----------------------------------------------------------------- */
        if @mode = 'History'
        begin
            set @startDate = isnull(@startDate, datefromparts(year(dbo.fnGetDate()), month(dbo.fnGetDate()), 1));
            set @endDate = isnull(@endDate, eomonth(@startDate));

            select @result =
            (
                select json_query(isnull
                (
                    (
                        select header.sg_id              as sgId,
                               header.sg_no              as docNo,
                               header.sg_date            as sgDate,
                               header.cutoff_code         as cutoffCode,
                               cutoff.cutoff_name         as cutoffName,
                               header.cutoff_freq         as cutoffFrequency,
                               header.cutoff_startdate    as cutoffStartDate,
                               header.cutoff_enddate      as cutoffEndDate,
                               header.tran_type           as tranType,
                               header.remarks             as remarks,
                               header.doc_status          as documentStatus,
                               case header.doc_status
                                    when 'F' then 'Finalized'
                                    when 'X' then 'Cancelled'
                                    else 'Open'
                               end                        as docStatus,
                               case header.doc_status
                                    when 'F' then 'Finalized'
                                    when 'X' then 'Cancelled'
                                    else 'Open'
                               end                        as status,
                               count(distinct detail.emp_no) as employeeCount,
                               count(detail.sg_id)          as detailCount,
                               isnull(sum(detail.amount), 0) as totalAmount
                        from dbo.trn_sg_hd as header
                        left join dbo.trn_sg_dt1 as detail
                            on detail.sg_id = header.sg_id
                        left join dbo.ref_cutoff as cutoff
                            on cutoff.cutoff_code = header.cutoff_code
                        where convert(date, header.sg_date) between @startDate and @endDate
                          and (@cutoffCode is null or header.cutoff_code = @cutoffCode)
                          and (@edType is null or exists
                              (select 1 from dbo.trn_sg_dt1 as categoryDetail
                               inner join dbo.ref_ed as categoryED on categoryED.ed_code = categoryDetail.ed_code
                               where categoryDetail.sg_id = header.sg_id and categoryED.ed_type = @edType))
                          and
                          (
                              @branchCode is null
                              or exists
                              (
                                  select 1
                                  from dbo.trn_sg_dt1 as branchDetail
                                  where branchDetail.sg_id = header.sg_id
                                    and branchDetail.branch_code = @branchCode
                              )
                          )
                        group by header.sg_id, header.sg_no, header.sg_date,
                                 header.cutoff_code, cutoff.cutoff_name, header.cutoff_freq,
                                 header.cutoff_startdate, header.cutoff_enddate,
                                 header.tran_type, header.remarks, header.doc_status
                        order by header.sg_date desc, header.sg_no desc
                        for json path, include_null_values
                    ), '[]'
                )) as SG_Summary,
                json_query(isnull
                (
                    (
                        select header.sg_id            as sgId,
                               header.sg_no            as docNo,
                               header.sg_date          as sgDate,
                               header.cutoff_code       as cutoffCode,
                               header.cutoff_freq       as cutoffFrequency,
                               detail.line_no           as detailLineNo,
                               detail.emp_no            as employeeNo,
                               detail.emp_name          as employeeName,
                               detail.ed_code           as edCode,
                               detail.ed_name           as edDescription,
                               detail.amount            as amount,
                               detail.ed_freq as frequency,
                               detail.hold_flag as holdFlag,
                               detail.branch_code       as branchCode,
                               detail.client_code       as clientCode,
                               detail.group_code        as payGroup,
                               detail.dept_code         as deptCode,
                               detail.start_date        as startDate,
                               detail.end_date          as endDate,
                               case header.doc_status
                                    when 'F' then 'Finalized'
                                    when 'X' then 'Cancelled'
                                    else 'Open'
                               end                      as docStatus
                        from dbo.trn_sg_hd as header
                        inner join dbo.trn_sg_dt1 as detail
                            on detail.sg_id = header.sg_id
                        where convert(date, header.sg_date) between @startDate and @endDate
                          and (@cutoffCode is null or header.cutoff_code = @cutoffCode)
                          and (@edType is null or exists
                              (select 1 from dbo.trn_sg_dt1 as categoryDetail
                               inner join dbo.ref_ed as categoryED on categoryED.ed_code = categoryDetail.ed_code
                               where categoryDetail.sg_id = header.sg_id and categoryED.ed_type = @edType))
                          and (@branchCode is null or detail.branch_code = @branchCode)
                        order by header.sg_date desc, header.sg_no desc, detail.line_no
                        for json path, include_null_values
                    ), '[]'
                )) as SG_Details
                for json path, without_array_wrapper
            );

            select isnull(@result, '{"SG_Summary":[],"SG_Details":[]}') as result;
            return;
        end;

        /* -----------------------------------------------------------------
           Get - header and complete detail row array for the JSX
           ----------------------------------------------------------------- */
        if @mode = 'Get'
        begin
            if @sgId is null and @sgNo is null
                throw 50001, 'sgId or sgNo is required.', 1;

            select top 1 @sgId = header.sg_id
            from dbo.trn_sg_hd as header
            where (@sgId is not null and header.sg_id = @sgId)
               or (@sgId is null and header.sg_no = @sgNo);

            if not exists (select 1 from dbo.trn_sg_hd where sg_id = @sgId)
                throw 50001, 'System Generated transaction was not found.', 1;

            select @result =
            (
                select header.sg_id            as sgId,
                       header.sg_no            as sgNo,
                       header.sg_date          as sgDate,
                       cutoff.cutoff_type       as cutoffType,
                       header.cutoff_freq       as cutoffFrequency,
                       header.cutoff_code       as cutoffCode,
                       cutoff.cutoff_name       as cutoffName,
                       header.cutoff_startdate  as cutoffStartDate,
                       header.cutoff_enddate    as cutoffEndDate,
                       header.tran_type         as tranType,
                       header.remarks           as remarks,
                       header.gen_code          as genCode,
                       header.doc_status        as documentStatus,
                       (
                           select top 1 branchDetail.branch_code
                           from dbo.trn_sg_dt1 as branchDetail
                           where branchDetail.sg_id = header.sg_id
                           order by branchDetail.line_no
                       )                         as branchCode,
                       json_query(isnull
                       (
                           (
                               select detail.group_id       as groupId,
                                      detail.line_no        as [lineNo],
                                      detail.emp_no         as empNo,
                                      detail.emp_name       as empName,
                                      detail.ed_code        as edCode,
                                      detail.ed_name        as edName,
                                      ed.ed_type            as edType,
                                      detail.start_date     as startDate,
                                      detail.end_date       as endDate,
                                      detail.amount         as amount,
                                      detail.ed_freq as frequency,
                                      detail.hold_flag as holdFlag,
                                      detail.comp_code      as compCode,
                                      detail.branch_code    as branchCode,
                                      detail.client_code    as clientCode,
                                      detail.group_code     as groupCode,
                                      detail.dept_code      as deptCode,
                                      detail.pos_code       as posCode,
                                      detail.stat_code      as statCode,
                                      detail.sg_code        as sgCode,
                                      detail.shift_code     as shiftCode,
                                      detail.gen_code       as genCode,
                                      detail.status         as status
                               from dbo.trn_sg_dt1 as detail
                               left join dbo.ref_ed as ed
                                   on ed.ed_code = detail.ed_code
                               where detail.sg_id = header.sg_id
                               order by detail.line_no
                               for json path, include_null_values
                           ), '[]'
                       )) as rows
                from dbo.trn_sg_hd as header
                left join dbo.ref_cutoff as cutoff
                    on cutoff.cutoff_code = header.cutoff_code
                where header.sg_id = @sgId
                for json path, without_array_wrapper, include_null_values
            );

            select isnull(@result, '{}') as result;
            return;
        end;

        /* -----------------------------------------------------------------
           PreparePayrunSG - legacy payrun conversion, read-only output
           ----------------------------------------------------------------- */
        if @mode in ('PreparePayrunSG', 'PreparePayrunOED')
        begin
            declare
                @_runType   nvarchar(20),
                @_includeNo bit;

            select @_runType = upper(isnull(json_value(@params, '$.jsonData.payrunType'), 'REG')),
                   @_includeNo = case
                                     when lower(isnull(json_value(@params, '$.jsonData.includeNotForPayroll'), 'false'))
                                          in ('true', '1') then 1
                                     else 0
                                 end;

            set @employeeNo = coalesce(@employeeNo, nullif(json_value(@params, '$.jsonData.employeeNo'), ''));
            set @cutoffFrequency = coalesce(@cutoffFrequency, nullif(upper(json_value(@params, '$.jsonData.frequency')), ''));

            if @employeeNo is null or @cutoffCode is null or @cutoffFrequency is null
                throw 50001, 'employeeNo, cutoffCode and cutoffFrequency are required.', 1;

            select @result =
            (
                select detail.sg_id            as sgId,
                       detail.sg_no            as sgNo,
                       detail.group_id          as groupId,
                       detail.line_no           as [lineNo],
                       detail.cutoff_code       as cutoffCode,
                       cutoff.cutoff_name       as cutoffName,
                       detail.cutoff_freq       as cutoffFrequency,
                       detail.emp_no            as empNo,
                       detail.emp_name          as empName,
                       detail.ed_code           as edCode,
                       detail.ed_name           as edName,
                       ed.ed_type               as edType,
                       ed.code                  as code,
                       isnull(ed.ctrp, '')      as ctrp,
                       detail.amount            as amount,
                       case when ed.ed_type = 'DED' then -1 else 1 end as payrollSign,
                       'SG'                    as hoursFlag,
                       cast(null as decimal(18, 6)) as hours,
                       cast(null as decimal(18, 6))          as days,
                       cast(null as decimal(18, 6))          as rate,
                       cast(null as decimal(18, 6))        as dailyRate,
                       cast(null as decimal(18, 6))         as hourRate,
                       case when upper(isnull(detail.hold_flag, 'N')) = 'Y' then 'N' else 'Y' end as payregFlag,
                       detail.ed_freq as frequency,
                       detail.hold_flag as holdFlag,
                       case
                            when upper(isnull(header.tran_type, '')) = 'LNADJ' then 'Y'
                            else ''
                       end                      as loanFlag,
                       case
                            when upper(isnull(header.tran_type, '')) = 'LNADJ' then cast(null as nvarchar(100))
                            else ''
                       end                      as loanRefNo,
                       case
                            when upper(isnull(header.tran_type, '')) in ('SPL', '13MP', '13TH')
                                 or upper(isnull(ed.code, '')) in ('13MP', '13MPNT') then '13MP'
                            else 'REG'
                       end                      as runType,
                       header.tran_type         as tranType,
                       cast(null as nvarchar(100))            as refNo,
                       header.remarks           as remarks,
                       detail.comp_code         as compCode,
                       detail.branch_code       as branchCode,
                       detail.client_code       as clientCode,
                       detail.group_code        as groupCode,
                       detail.dept_code         as deptCode,
                       detail.pos_code          as posCode,
                       detail.stat_code         as statCode,
                       detail.gen_code          as genCode,
                       case
                            when ed.code in ('SSS', 'MED', 'HDMF') then cast(1 as bit)
                            else cast(0 as bit)
                       end                      as needsStatutoryContributionReview,
                       cast(null as decimal(18, 2)) as employerShare,
                       cast(null as decimal(18, 2)) as employerEcc,
                       cast(null as decimal(18, 2)) as semiPay
                from dbo.trn_sg_dt1 as detail
                inner join dbo.trn_sg_hd as header
                    on header.sg_id = detail.sg_id
                inner join dbo.ref_ed as ed
                    on ed.ed_code = detail.ed_code
                left join dbo.ref_cutoff as cutoff
                    on cutoff.cutoff_code = detail.cutoff_code
                where detail.emp_no = @employeeNo
                  and detail.cutoff_code = @cutoffCode
                  and upper(detail.cutoff_freq) = @cutoffFrequency
                  and header.doc_status = 'F'
                  and detail.status = 'F'
                  and (@_includeNo = 1 or upper(isnull(detail.hold_flag, 'N')) <> 'Y')
                  and
                  (
                      (
                          @_runType = '13TH'
                          and
                          (
                              upper(isnull(header.tran_type, '')) in ('SPL', '13MP', '13TH')
                              or upper(isnull(ed.code, '')) in ('13MP', '13MPNT')
                          )
                      )
                      or
                      (
                          @_runType <> '13TH'
                          and upper(isnull(header.tran_type, '')) not in ('SPL', '13MP', '13TH')
                          and upper(isnull(ed.code, '')) not in ('13MP', '13MPNT')
                      )
                  )
                order by detail.sg_date, detail.sg_no, detail.line_no
                for json path, include_null_values
            );

            select isnull(@result, '[]') as result;
            return;
        end;

        /* -----------------------------------------------------------------
           Save / Post / Cancel - the only write modes
           ----------------------------------------------------------------- */
        if @userCode is null or len(@userCode) > 100
            throw 50001, 'userCode is required and must not exceed 100 characters.', 1;

        if @mode in ('Post', 'Cancel')
        begin
            if @sgId is null
                throw 50001, 'sgId is required.', 1;

            if @mode = 'Cancel' and @remarks is null
                throw 50001, 'Cancellation reason is required.', 1;

            begin transaction;

            set @sgNo = null;
            select @sgNo = header.sg_no
            from dbo.trn_sg_hd as header with (updlock, holdlock)
            where header.sg_id = @sgId
              and isnull(header.doc_status, 'D') in ('D', '');

            if @sgNo is null
                throw 50001, 'Only an Open transaction may be posted or cancelled.', 1;

            if @mode = 'Post'
               and not exists
               (
                   select 1
                   from dbo.trn_sg_dt1
                   where sg_id = @sgId
               )
                throw 50001, 'At least one employee detail is required before posting.', 1;

            set @currentDate = dbo.fnGetDate();

            update dbo.trn_sg_hd
            set doc_status = case when @mode = 'Post' then 'F' else 'X' end,
                remarks    = case when @mode = 'Cancel' then @remarks else remarks end,
                user_code  = @userCode,
                date_stamp = @currentDate,
                time_stamp = convert(varchar(8), @currentDate, 108)
            where sg_id = @sgId;

            update dbo.trn_sg_dt1
            set status = case when @mode = 'Post' then 'F' else 'X' end
            where sg_id = @sgId;

            commit transaction;

            select @sgId as sgId,
                   @sgNo as sgNo,
                   case when @mode = 'Post' then 'Finalized' else 'Cancelled' end as message;
            return;
        end;

        if @mode = 'Save'
        begin
            if @sgDate is null
                throw 50001, 'Transaction Date is required.', 1;
            if @cutoffType is null or @cutoffType not in ('S', 'M', 'W')
                throw 50001, 'Pay Frequency must be S, M, or W.', 1;
            if @cutoffCode is null or @cutoffFrequency is null
                throw 50001, 'Payroll Cut-Off and Cut-Off Frequency are required.', 1;
            if @cutoffStartDate is null or @cutoffEndDate is null or @cutoffEndDate < @cutoffStartDate
                throw 50001, 'Valid Payroll Cut-Off Start/End Dates are required.', 1;
            if @edType is not null and @edType not in ('EARN', 'DED')
                throw 50001, 'Category must be EARN or DED when supplied.', 1;
            if not exists
            (
                select 1 from dbo.ref_cutoff
                where cutoff_code = @cutoffCode and cutoff_type = @cutoffType
                  and upper(cutoff_freq) = @cutoffFrequency
            )
                throw 50001, 'Payroll Cut-Off, type and frequency do not match REF_CUTOFF.', 1;
            if @rows is null or left(ltrim(@rows), 1) <> '[' or not exists (select 1 from openjson(@rows))
                throw 50001, 'Add at least one detail row.', 1;

            -- Parse strings at their full input size so validation cannot hide truncation.
            declare @details table
            (
                groupId nvarchar(max), rowNo int, empNo nvarchar(max), edCode nvarchar(max),
                startDate date, endDate date, frequency nvarchar(max), amount decimal(18, 2),
                holdFlag nvarchar(max), genCode nvarchar(max)
            );
            insert into @details
            select nullif(ltrim(rtrim(detail.groupId)), ''), detail.rowNo,
                   nullif(ltrim(rtrim(detail.empNo)), ''), nullif(ltrim(rtrim(detail.edCode)), ''),
                   isnull(detail.startDate, @cutoffStartDate), isnull(detail.endDate, @cutoffEndDate),
                   upper(nullif(ltrim(rtrim(coalesce(detail.frequency, detail.edFreq))), '')),
                   detail.amount, upper(isnull(nullif(ltrim(rtrim(detail.holdFlag)), ''), 'N')),
                   isnull(nullif(ltrim(rtrim(detail.genCode)), ''), isnull(@genCode, 'M'))
            from openjson(@rows)
            with
            (
                groupId nvarchar(max) '$.groupId', rowNo int '$.lineNo',
                empNo nvarchar(max) '$.empNo', edCode nvarchar(max) '$.edCode',
                startDate date '$.startDate', endDate date '$.endDate',
                frequency nvarchar(max) '$.frequency', edFreq nvarchar(max) '$.edFreq',
                amount decimal(18, 2) '$.amount', holdFlag nvarchar(max) '$.holdFlag',
                genCode nvarchar(max) '$.genCode'
            ) as detail;

            if exists
            (
                select 1 from @details
                where empNo is null or len(empNo) > 15 or edCode is null or len(edCode) > 15
                   or len(groupId) > 200 or startDate is null or endDate is null or endDate < startDate
                   or amount is null or amount < 0 or frequency is null
                   or frequency not in ('S', 'M', 'W') or len(frequency) > 5
                   or holdFlag not in ('Y', 'N') or len(genCode) > 5
            )
                throw 50001, 'Invalid row: check Employee, Code, dates, nonnegative Amount, Frequency (S/M/W), Hold Flag (Y/N), and field lengths.', 1;
            if exists
            (
                select 1 from @details as detail
                left join dbo.refmast_employee as employee on employee.emp_no = detail.empNo
                    and upper(isnull(employee.active, 'Y')) in ('Y', '1', 'TRUE', 'A')
                where employee.emp_no is null
            )
                throw 50001, 'One or more employees do not exist or are inactive.', 1;
            if exists
            (
                select 1 from @details as detail
                inner join dbo.refmast_employee as employee on employee.emp_no = detail.empNo
                where employee.pay_freq is null or upper(ltrim(rtrim(employee.pay_freq))) <> @cutoffType
            )
                throw 50001, 'One or more employees have a different Pay Frequency.', 1;
            if exists
            (
                select 1 from @details as detail
                left join dbo.ref_ed as ed on ed.ed_code = detail.edCode
                    and (@edType is null or ed.ed_type = @edType)
                    and upper(isnull(ed.active, 'Y')) in ('Y', '1', 'TRUE', 'A')
                where ed.ed_code is null
            )
                throw 50001, 'One or more ED codes are invalid, inactive, or of the wrong category.', 1;
            if exists
            (
                select 1 from @details
                group by empNo, edCode, startDate, endDate
                having count(*) > 1
            )
                throw 50001, 'Duplicate Employee, Code, and date range in the same transaction.', 1;

            begin transaction;
            exec @lockResult = sys.sp_getapplock
                @resource = 'TRN_SG_SAVE', @lockMode = 'Exclusive',
                @lockOwner = 'Transaction', @lockTimeout = 10000;
            if @lockResult < 0
                throw 50001, 'Another user is saving a System Generated transaction. Please retry.', 1;
            set @currentDate = dbo.fnGetDate();

            if @sgId is null
            begin
                set @sgId = convert(nvarchar(50), newid());
                select @nextNo = isnull(max(try_convert(bigint, substring(sg_no, 3, 8))), 0) + 1
                from dbo.trn_sg_hd with (updlock, holdlock)
                where sg_no like 'SG[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]';
                if @nextNo > 99999999
                    throw 50001, 'SG transaction number sequence has been exhausted.', 1;
                set @sgNo = concat('SG', right(concat('00000000', convert(varchar(8), @nextNo)), 8));
                insert into dbo.trn_sg_hd
                (
                    sg_id, sg_no, sg_date, cutoff_freq, cutoff_code, cutoff_startdate, cutoff_enddate,
                    tran_type, remarks, gen_code, doc_status, user_code, date_stamp, time_stamp
                )
                values
                (
                    @sgId, @sgNo, @sgDate, @cutoffFrequency, @cutoffCode, @cutoffStartDate, @cutoffEndDate,
                    isnull(@tranType, 'Regular'), @remarks, isnull(@genCode, 'M'), 'D',
                    @userCode, @currentDate, convert(varchar(8), @currentDate, 108)
                );
            end
            else
            begin
                set @sgNo = null;
                select @sgNo = header.sg_no
                from dbo.trn_sg_hd as header with (updlock, holdlock)
                where header.sg_id = @sgId and isnull(header.doc_status, 'D') in ('D', '');
                if @sgNo is null
                    throw 50001, 'Only an Open System Generated transaction can be edited.', 1;
                update dbo.trn_sg_hd
                set sg_date = @sgDate, cutoff_freq = @cutoffFrequency, cutoff_code = @cutoffCode,
                    cutoff_startdate = @cutoffStartDate, cutoff_enddate = @cutoffEndDate,
                    tran_type = isnull(@tranType, 'Regular'), remarks = @remarks,
                    user_code = @userCode, date_stamp = @currentDate,
                    time_stamp = convert(varchar(8), @currentDate, 108)
                where sg_id = @sgId;
                delete from dbo.trn_sg_dt1 where sg_id = @sgId;
            end;

            insert into dbo.trn_sg_dt1
            (
                sg_id, sg_no, sg_date, cutoff_freq, cutoff_code, group_id, line_no,
                emp_no, emp_name, start_date, end_date, ed_freq, ed_code, ed_name, amount, hold_flag,
                comp_code, branch_code, client_code, group_code, dept_code, pos_code,
                stat_code, sg_code, shift_code, gen_code, status
            )
            select @sgId, @sgNo, @sgDate, @cutoffFrequency, @cutoffCode,
                   isnull(detail.groupId, convert(nvarchar(200), newid())),
                   row_number() over (order by isnull(detail.rowNo, 2147483647), detail.empNo, detail.edCode),
                   employee.emp_no, employee.emp_name, detail.startDate, detail.endDate,
                   detail.frequency, ed.ed_code, ed.ed_name, detail.amount, detail.holdFlag,
                   employee.comp_code, employee.branch_code, employee.client_code,
                   employee.group_code, employee.dept_code, employee.pos_code,
                   employee.stat_code, employee.sg_code, employee.shift_code, detail.genCode, 'D'
            from @details as detail
            inner join dbo.refmast_employee as employee on employee.emp_no = detail.empNo
            inner join dbo.ref_ed as ed on ed.ed_code = detail.edCode;
            commit transaction;
            select @sgId as sgId, @sgNo as sgNo, 'Saved' as message;
            return;
        end;
    end try
    begin catch
        if xact_state() <> 0 rollback transaction;
        select error_message() as errorMsg, error_number() as errorNumber, 1 as errorCount;
    end catch;
end;
GO

