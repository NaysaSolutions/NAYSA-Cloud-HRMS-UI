-- Required because the supplied/live TRN_SG_HD has no SG_ID or SG_NO.
-- Review and run before sproc_PHP_Tran_SystemGenerated.sql.
-- Existing headers cannot be reliably linked to details without these keys.
SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;
    IF OBJECT_ID(N'dbo.TRN_SG_HD', N'U') IS NULL
        THROW 50001, 'dbo.TRN_SG_HD does not exist.', 1;
    IF OBJECT_ID(N'dbo.TRN_SG_DT1', N'U') IS NULL
        THROW 50001, 'dbo.TRN_SG_DT1 does not exist.', 1;

    IF COL_LENGTH(N'dbo.TRN_SG_HD', N'SG_ID') IS NULL
       OR COL_LENGTH(N'dbo.TRN_SG_HD', N'SG_NO') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM dbo.TRN_SG_HD)
           OR EXISTS (SELECT 1 FROM dbo.TRN_SG_DT1)
            THROW 50001, 'Existing SG records require a reviewed header/detail key backfill before adding SG_ID/SG_NO.', 1;
        IF COL_LENGTH(N'dbo.TRN_SG_HD', N'SG_ID') IS NULL
            EXEC(N'ALTER TABLE dbo.TRN_SG_HD ADD SG_ID nvarchar(50) NOT NULL;');
        IF COL_LENGTH(N'dbo.TRN_SG_HD', N'SG_NO') IS NULL
            EXEC(N'ALTER TABLE dbo.TRN_SG_HD ADD SG_NO nvarchar(10) NOT NULL;');
    END;
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.TRN_SG_HD') AND name = N'UX_TRN_SG_HD_SG_ID')
        EXEC(N'CREATE UNIQUE INDEX UX_TRN_SG_HD_SG_ID ON dbo.TRN_SG_HD(SG_ID);');
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.TRN_SG_HD') AND name = N'UX_TRN_SG_HD_SG_NO')
        EXEC(N'CREATE UNIQUE INDEX UX_TRN_SG_HD_SG_NO ON dbo.TRN_SG_HD(SG_NO);');
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
