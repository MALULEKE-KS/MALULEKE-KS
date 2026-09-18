-- DropIndex
DROP INDEX "AdminUser_email_idx";

-- CreateIndex
CREATE INDEX "Impact_systemId_sortOrder_idx" ON "Impact"("systemId", "sortOrder");

-- CreateIndex
CREATE INDEX "Inquiry_inquiryTypeId_idx" ON "Inquiry"("inquiryTypeId");

-- CreateIndex
CREATE INDEX "Skill_categoryId_idx" ON "Skill"("categoryId");

-- CreateIndex
CREATE INDEX "SkillOnExperience_experienceId_idx" ON "SkillOnExperience"("experienceId");

-- CreateIndex
CREATE INDEX "SkillOnSystem_systemId_idx" ON "SkillOnSystem"("systemId");

-- CreateIndex
CREATE INDEX "System_statusId_idx" ON "System"("statusId");

-- CreateIndex
CREATE INDEX "Testimonial_systemId_idx" ON "Testimonial"("systemId");

-- CreateIndex
CREATE INDEX "Timeline_milestoneTypeId_idx" ON "Timeline"("milestoneTypeId");
