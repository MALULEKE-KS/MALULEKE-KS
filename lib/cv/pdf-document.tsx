// lib/cv/pdf-document.tsx
// The "genuinely different output for a genuinely different job" print
// artifact (docs/PAGE-SPECIFICATIONS.md "/cv") — a real, standalone PDF, not
// a browser print-to-PDF of the on-screen page. BR-7.1: built fresh from
// whatever's passed in at generation time, never a static template.

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { toExperienceEntry, toEducationEntry, toSkillEntry } from "@/lib/rules/cv";

type ExperienceEntry = ReturnType<typeof toExperienceEntry>;
type EducationEntry = ReturnType<typeof toEducationEntry>;
type SkillEntry = ReturnType<typeof toSkillEntry>;

interface CvDocumentProps {
  name: string;
  roleLine: string;
  targetRole: string | null;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillEntry[];
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#0F1729" },
  name: { fontSize: 22, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  roleLine: { fontSize: 11, color: "#3D4A5C", marginBottom: 16 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#906722",
    marginTop: 16,
    marginBottom: 8,
    borderBottom: "1pt solid #3D4A5C",
    paddingBottom: 4,
  },
  entry: { marginBottom: 10 },
  entryHeaderRow: { flexDirection: "row", justifyContent: "space-between" },
  entryTitle: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  entryDates: { fontSize: 9, color: "#3D4A5C" },
  entryOrg: { fontSize: 10, color: "#3D4A5C", marginBottom: 3 },
  entryDescription: { fontSize: 9.5, lineHeight: 1.4 },
  skillCategoryLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#3D4A5C", marginTop: 6, marginBottom: 2 },
  skillRow: { flexDirection: "row", flexWrap: "wrap" },
  skillChip: { fontSize: 9, border: "1pt solid #3D4A5C", borderRadius: 2, paddingVertical: 2, paddingHorizontal: 6, marginRight: 6, marginBottom: 6 },
});

function formatDateRange(startDate: string, endDate: string | null): string {
  const start = new Date(startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const end = endDate ? new Date(endDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Present";
  return `${start} — ${end}`;
}

function groupSkillsByCategory(skills: SkillEntry[]): Map<string, SkillEntry[]> {
  const groups = new Map<string, SkillEntry[]>();
  for (const skill of skills) {
    const existing = groups.get(skill.category) ?? [];
    existing.push(skill);
    groups.set(skill.category, existing);
  }
  return groups;
}

export function CvDocument({ name, roleLine, targetRole, experience, education, skills }: CvDocumentProps) {
  const skillGroups = groupSkillsByCategory(skills);

  return (
    <Document title={`${name} — CV${targetRole ? ` (${targetRole})` : ""}`} author={name}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.roleLine}>{roleLine}</Text>

        {experience.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Experience</Text>
            {experience.map((entry) => (
              <View key={entry.id} style={styles.entry} wrap={false}>
                <View style={styles.entryHeaderRow}>
                  <Text style={styles.entryTitle}>{entry.title}</Text>
                  <Text style={styles.entryDates}>{formatDateRange(entry.startDate, entry.endDate)}</Text>
                </View>
                <Text style={styles.entryOrg}>{entry.organization}</Text>
                <Text style={styles.entryDescription}>{entry.description}</Text>
              </View>
            ))}
          </View>
        )}

        {education.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Education</Text>
            {education.map((entry) => (
              <View key={entry.id} style={styles.entry} wrap={false}>
                <View style={styles.entryHeaderRow}>
                  <Text style={styles.entryTitle}>{entry.qualification}</Text>
                  <Text style={styles.entryDates}>{formatDateRange(entry.startDate, entry.endDate)}</Text>
                </View>
                <Text style={styles.entryOrg}>{entry.institution}</Text>
                {entry.honors && <Text style={styles.entryDescription}>{entry.honors}</Text>}
              </View>
            ))}
          </View>
        )}

        {skillGroups.size > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Skills</Text>
            {[...skillGroups.entries()].map(([category, categorySkills]) => (
              <View key={category}>
                <Text style={styles.skillCategoryLabel}>{category}</Text>
                <View style={styles.skillRow}>
                  {categorySkills.map((skill) => (
                    <Text key={skill.id} style={styles.skillChip}>
                      {skill.name}
                      {skill.yearsExperience ? ` (${skill.yearsExperience}y)` : ""}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
