USE [db_a9be64_naysacloudhris]
GO

/****** Object:  StoredProcedure [dbo].[sproc_PHP_RefOvertime]    Script Date: 9/30/2026 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sproc_PHP_RefOvertime]
    @mode   NVARCHAR(MAX),
    @params NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    /* ============================================================
       Normalize simple-value modes
       ============================================================ */
    SET @params =
        CASE
            WHEN @mode IN ('Get', 'CheckDuplicate', 'CheckInUsed')
                 AND ISJSON(@params) <> 1
            THEN CONCAT(
                '{"json_data":{"otType":"',
                STRING_ESCAPE(ISNULL(@params, ''), 'json'),
                '"}}'
            )
            ELSE @params
        END;

    /* ============================================================
       Parameters
       ============================================================ */
    DECLARE
        @_otType         NVARCHAR(MAX)  = JSON_VALUE(@params, '$.json_data.otType'),
        @_otNo           INT            = TRY_CONVERT(INT, JSON_VALUE(@params, '$.json_data.otNo')),
        @_otCode         NVARCHAR(MAX)  = JSON_VALUE(@params, '$.json_data.otCode'),
        @_otName         NVARCHAR(MAX)  = JSON_VALUE(@params, '$.json_data.otName'),
        @_otRateRaw      NVARCHAR(MAX)  = JSON_VALUE(@params, '$.json_data.otRate'),
        @_otRate         DECIMAL(18,6)  = TRY_CONVERT(DECIMAL(18,6), JSON_VALUE(@params, '$.json_data.otRate')),
        @_edCode         NVARCHAR(MAX)  = JSON_VALUE(@params, '$.json_data.edCode'),
        @_edName         NVARCHAR(MAX)  = JSON_VALUE(@params, '$.json_data.edName'),
        @_ndFlag         NVARCHAR(1)    = JSON_VALUE(@params, '$.json_data.ndFlag'),
        @_holFlag        NVARCHAR(1)    = JSON_VALUE(@params, '$.json_data.holFlag'),
        @_type           NVARCHAR(MAX)  = JSON_VALUE(@params, '$.json_data.type'),
        @_includeAllow   NVARCHAR(1)    = JSON_VALUE(@params, '$.json_data.includeAllow'),
        @_withApp        NVARCHAR(1)    = JSON_VALUE(@params, '$.json_data.withApp'),
        @_active         NVARCHAR(1)    = JSON_VALUE(@params, '$.json_data.active'),
        @_userCode       NVARCHAR(MAX)  = JSON_VALUE(@params, '$.json_data.userCode'),

        @_date           DATETIME       = dbo.fnGetDate(),
        @_result         NVARCHAR(MAX),
        @errorMsg        NVARCHAR(MAX)  = '',
        @beforeValue     NVARCHAR(MAX),
        @afterValue      NVARCHAR(MAX),
        @activity        NVARCHAR(20),

        @tableName       NVARCHAR(128)  = 'REF_OT',
        @referenceColumn NVARCHAR(128)  = 'OT_TYPE';


    /* ============================================================
       UPSERT
       ============================================================ */
    IF @mode = 'Upsert'
    BEGIN
        SELECT @errorMsg = STRING_AGG(CONCAT('• ', fieldName), CHAR(10))
        FROM
        (
            VALUES
                (@_otType,    'OT Type'),
                (@_otCode,    'OT Code'),
                (@_otName,    'OT Name'),
                (@_otRateRaw, 'OT Rate'),
                (@_active,    'Active')
        ) requiredFields(fieldValue, fieldName)
        WHERE ISNULL(LTRIM(RTRIM(fieldValue)), '') = '';

        IF @errorMsg IS NOT NULL
        BEGIN
            SELECT
                CONCAT(
                    'Please fill in the required field(s):',
                    CHAR(10),
                    @errorMsg
                ) AS errormsg,
                1 AS errorcount;
            RETURN;
        END;

        IF @_otRate IS NULL OR @_otRate < 0
        BEGIN
            SELECT
                'OT Rate must be a valid number greater than or equal to zero.' AS errormsg,
                1 AS errorcount;
            RETURN;
        END;

        /* Standardize Y/N fields */
        SET @_ndFlag =
            CASE WHEN UPPER(ISNULL(@_ndFlag, 'N')) = 'Y' THEN 'Y' ELSE 'N' END;

        SET @_holFlag =
            CASE WHEN UPPER(ISNULL(@_holFlag, 'N')) = 'Y' THEN 'Y' ELSE 'N' END;

        SET @_includeAllow =
            CASE WHEN UPPER(ISNULL(@_includeAllow, 'N')) = 'Y' THEN 'Y' ELSE 'N' END;

        SET @_withApp =
            CASE WHEN UPPER(ISNULL(@_withApp, 'Y')) = 'Y' THEN 'Y' ELSE 'N' END;

        SET @_active =
            CASE WHEN UPPER(ISNULL(@_active, 'Y')) = 'Y' THEN 'Y' ELSE 'N' END;

        BEGIN TRY
            BEGIN TRANSACTION;

            IF NOT EXISTS
            (
                SELECT 1
                FROM REF_OT
                WHERE OT_TYPE = @_otType
            )
            BEGIN
                /*
                   Supports either:
                   1. OT_NO is IDENTITY
                   2. OT_NO is a normal numeric column
                */
                IF COLUMNPROPERTY(
                       OBJECT_ID('dbo.REF_OT'),
                       'OT_NO',
                       'IsIdentity'
                   ) = 1
                BEGIN
                    INSERT INTO REF_OT
                    (
                        OT_TYPE,
                        OT_CODE,
                        OT_NAME,
                        OT_RATE,
                        ED_CODE,
                        ED_NAME,
                        ND_FLAG,
                        HOL_FLAG,
                        [TYPE],
                        INCLUDE_ALLOW,
                        WITH_APP,
                        ACTIVE,
                        REGISTERED_BY,
                        REGISTERED_DATE
                    )
                    VALUES
                    (
                        @_otType,
                        @_otCode,
                        @_otName,
                        @_otRate,
                        NULLIF(@_edCode, ''),
                        NULLIF(@_edName, ''),
                        @_ndFlag,
                        @_holFlag,
                        NULLIF(@_type, ''),
                        @_includeAllow,
                        @_withApp,
                        @_active,
                        @_userCode,
                        @_date
                    );
                END
                ELSE
                BEGIN
                    IF @_otNo IS NULL
                    BEGIN
                        SELECT @_otNo = ISNULL(MAX(OT_NO), 0) + 1
                        FROM REF_OT WITH (UPDLOCK, HOLDLOCK);
                    END;

                    INSERT INTO REF_OT
                    (
                        OT_TYPE,
                        OT_NO,
                        OT_CODE,
                        OT_NAME,
                        OT_RATE,
                        ED_CODE,
                        ED_NAME,
                        ND_FLAG,
                        HOL_FLAG,
                        [TYPE],
                        INCLUDE_ALLOW,
                        WITH_APP,
                        ACTIVE,
                        REGISTERED_BY,
                        REGISTERED_DATE
                    )
                    VALUES
                    (
                        @_otType,
                        @_otNo,
                        @_otCode,
                        @_otName,
                        @_otRate,
                        NULLIF(@_edCode, ''),
                        NULLIF(@_edName, ''),
                        @_ndFlag,
                        @_holFlag,
                        NULLIF(@_type, ''),
                        @_includeAllow,
                        @_withApp,
                        @_active,
                        @_userCode,
                        @_date
                    );
                END;

                SET @activity = 'Added';

                EXEC sproc_PHP_HSTools_ReturnSelect_CamelCase
                    @tableName  = @tableName,
                    @filterCol  = @referenceColumn,
                    @filterVal  = @_otType,
                    @jsonResult = @afterValue OUTPUT;
            END
            ELSE
            BEGIN
                SET @activity = 'Edited';

                EXEC sproc_PHP_HSTools_ReturnSelect_CamelCase
                    @tableName  = @tableName,
                    @filterCol  = @referenceColumn,
                    @filterVal  = @_otType,
                    @jsonResult = @beforeValue OUTPUT;

                UPDATE REF_OT
                SET
                    OT_CODE        = @_otCode,
                    OT_NAME        = @_otName,
                    OT_RATE        = @_otRate,
                    ED_CODE        = NULLIF(@_edCode, ''),
                    ED_NAME        = NULLIF(@_edName, ''),
                    ND_FLAG        = @_ndFlag,
                    HOL_FLAG       = @_holFlag,
                    [TYPE]         = NULLIF(@_type, ''),
                    INCLUDE_ALLOW  = @_includeAllow,
                    WITH_APP       = @_withApp,
                    ACTIVE         = @_active,
                    UPDATED_BY     = @_userCode,
                    UPDATED_DATE   = @_date
                WHERE OT_TYPE = @_otType;

                EXEC sproc_PHP_HSTools_ReturnSelect_CamelCase
                    @tableName  = @tableName,
                    @filterCol  = @referenceColumn,
                    @filterVal  = @_otType,
                    @jsonResult = @afterValue OUTPUT;
            END;

            EXEC sproc_PHP_DocTrail
                @_mode      = 'UpsertRefTrail',
                @_tblCode   = @tableName,
                @_activity  = @activity,
                @_refCode   = @_otType,
                @_refName   = @_otName,
                @_userCode  = @_userCode,
                @_beforeVal = @beforeValue,
                @_afterVal  = @afterValue;

            COMMIT TRANSACTION;

            SELECT
                '' AS errormsg,
                0 AS errorcount;
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            THROW;
        END CATCH;

        RETURN;
    END;


    /* ============================================================
       LOAD / LOOKUP
       ============================================================ */
    IF @mode IN ('Load', 'Lookup')
    BEGIN
        SELECT @_result =
        (
            SELECT
                a.OT_TYPE                    AS otType,
                a.OT_NO                      AS otNo,
                a.OT_CODE                    AS otCode,
                a.OT_NAME                    AS otName,
                a.OT_RATE                    AS otRate,
                a.ED_CODE                    AS edCode,
                a.ED_NAME                    AS edName,
                ISNULL(a.ND_FLAG, 'N')       AS ndFlag,
                ISNULL(a.HOL_FLAG, 'N')      AS holFlag,
                a.[TYPE]                     AS type,
                ISNULL(a.INCLUDE_ALLOW, 'N') AS includeAllow,
                ISNULL(a.WITH_APP, 'Y')      AS withApp,
                ISNULL(a.ACTIVE, 'Y')        AS active,

                ISNULL(
                    registeredUser.USER_NAME,
                    a.REGISTERED_BY
                ) AS registeredBy,

                a.REGISTERED_DATE AS registeredDate,

                ISNULL(
                    updatedUser.USER_NAME,
                    a.UPDATED_BY
                ) AS lastUpdatedBy,

                a.UPDATED_DATE AS lastUpdatedDate

            FROM REF_OT a

            LEFT JOIN USERS registeredUser
                ON registeredUser.USER_CODE = a.REGISTERED_BY

            LEFT JOIN USERS updatedUser
                ON updatedUser.USER_CODE = a.UPDATED_BY

            ORDER BY
                a.OT_TYPE

            FOR JSON PATH, INCLUDE_NULL_VALUES
        );

        SELECT ISNULL(@_result, '[]') AS result;
        RETURN;
    END;


    /* ============================================================
       GET
       ============================================================ */
    IF @mode = 'Get'
    BEGIN
        SELECT @_result =
        (
            SELECT TOP 1
                a.OT_TYPE                    AS otType,
                a.OT_NO                      AS otNo,
                a.OT_CODE                    AS otCode,
                a.OT_NAME                    AS otName,
                a.OT_RATE                    AS otRate,
                a.ED_CODE                    AS edCode,
                a.ED_NAME                    AS edName,
                ISNULL(a.ND_FLAG, 'N')       AS ndFlag,
                ISNULL(a.HOL_FLAG, 'N')      AS holFlag,
                a.[TYPE]                     AS type,
                ISNULL(a.INCLUDE_ALLOW, 'N') AS includeAllow,
                ISNULL(a.WITH_APP, 'Y')      AS withApp,
                ISNULL(a.ACTIVE, 'Y')        AS active,

                ISNULL(
                    registeredUser.USER_NAME,
                    a.REGISTERED_BY
                ) AS registeredBy,

                a.REGISTERED_DATE AS registeredDate,

                ISNULL(
                    updatedUser.USER_NAME,
                    a.UPDATED_BY
                ) AS lastUpdatedBy,

                a.UPDATED_DATE AS lastUpdatedDate

            FROM REF_OT a

            LEFT JOIN USERS registeredUser
                ON registeredUser.USER_CODE = a.REGISTERED_BY

            LEFT JOIN USERS updatedUser
                ON updatedUser.USER_CODE = a.UPDATED_BY

            WHERE
                a.OT_TYPE = @_otType

            FOR JSON PATH, INCLUDE_NULL_VALUES
        );

        SELECT ISNULL(@_result, '[]') AS result;
        RETURN;
    END;


    /* ============================================================
       DELETE
       ============================================================ */
    IF @mode = 'Delete'
    BEGIN
        BEGIN TRY
            BEGIN TRANSACTION;

            SELECT
                @_otName = OT_NAME
            FROM REF_OT
            WHERE OT_TYPE = @_otType;

            SET @activity = 'Deleted';

            EXEC sproc_PHP_HSTools_ReturnSelect_CamelCase
                @tableName  = @tableName,
                @filterCol  = @referenceColumn,
                @filterVal  = @_otType,
                @jsonResult = @beforeValue OUTPUT;

            DELETE FROM REF_OT
            WHERE OT_TYPE = @_otType;

            EXEC sproc_PHP_DocTrail
                @_mode      = 'UpsertRefTrail',
                @_tblCode   = @tableName,
                @_activity  = @activity,
                @_refCode   = @_otType,
                @_refName   = @_otName,
                @_userCode  = @_userCode,
                @_beforeVal = @beforeValue;

            COMMIT TRANSACTION;

            SELECT
                '' AS errormsg,
                0 AS errorcount;
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            THROW;
        END CATCH;

        RETURN;
    END;


    /* ============================================================
       CHECK DUPLICATE
       ============================================================ */
    IF @mode = 'CheckDuplicate'
    BEGIN
        SELECT
            CASE
                WHEN EXISTS
                (
                    SELECT 1
                    FROM REF_OT
                    WHERE OT_TYPE = @_otType
                )
                THEN '{"result":"1"}'
                ELSE '{"result":"0"}'
            END AS result;

        RETURN;
    END;


    /* ============================================================
       CHECK IN USED
       ------------------------------------------------------------
       HRMS-safe generic check:
       - looks for OT_TYPE references in other user tables
       - excludes REF_OT itself
       - avoids inventing transaction table names
       ============================================================ */
    IF @mode = 'CheckInUsed'
    BEGIN
        DECLARE
            @sql      NVARCHAR(MAX) = N'',
            @isInUsed BIT = 0;

        SELECT @sql = STRING_AGG(
            CAST(
                N'IF @used = 0 AND EXISTS (
                    SELECT 1
                    FROM ' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) + N'
                    WHERE TRY_CONVERT(NVARCHAR(MAX), ' + QUOTENAME(c.name) + N') = @otType
                )
                SET @used = 1;'
                AS NVARCHAR(MAX)
            ),
            CHAR(10)
        )
        FROM sys.tables t
        INNER JOIN sys.schemas s
            ON s.schema_id = t.schema_id
        INNER JOIN sys.columns c
            ON c.object_id = t.object_id
        WHERE
            UPPER(c.name) = 'OT_TYPE'
            AND NOT (
                UPPER(s.name) = 'DBO'
                AND UPPER(t.name) = 'REF_OT'
            )
            AND t.is_ms_shipped = 0;

        IF ISNULL(@sql, '') <> ''
        BEGIN
            EXEC sys.sp_executesql
                @sql,
                N'@otType NVARCHAR(MAX), @used BIT OUTPUT',
                @otType = @_otType,
                @used = @isInUsed OUTPUT;
        END;

        SELECT
            CASE
                WHEN @isInUsed = 1
                    THEN '{"result":"1"}'
                ELSE '{"result":"0"}'
            END AS result;

        RETURN;
    END;
END;
GO
