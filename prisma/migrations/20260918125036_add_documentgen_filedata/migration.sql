/*
  Warnings:

  - Added the required column `fileData` to the `DocumentGen` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DocumentGen" ADD COLUMN     "fileData" BYTEA NOT NULL;
