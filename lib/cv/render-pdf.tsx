// lib/cv/render-pdf.tsx
// The CV as PDF (#74), from the same model as the DOCX. ATS-safe by design:
// one column, real selectable text in reading order (no tables, columns,
// icons or images carrying content), a standard font, standard headings, and
// every link written out as text as well as clickable.

import { Document, Font, Link, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { CvModel } from "@/lib/cv/model";
import { SECTION, contactLines, dateRange, displayUrl, headlineLine, monthYear } from "@/lib/cv/format";

// Never hyphenate: a split word or URL ("linkedin.com/in/name-suc-cess") is
// misread by ATS parsers and breaks the link as text.
Font.registerHyphenationCallback((word) => [word]);

const INK = "#111111";
const MUTED = "#444444";

const styles = StyleSheet.create({
  page: { paddingVertical: 36, paddingHorizontal: 42, fontFamily: "Helvetica", fontSize: 10, color: INK, lineHeight: 1.35 },
  name: { fontSize: 20, fontFamily: "Helvetica-Bold", lineHeight: 1.2, marginBottom: 2 },
  headline: { fontSize: 11, color: MUTED },
  contact: { fontSize: 9, marginTop: 2, color: MUTED },
  link: { color: INK, textDecoration: "none" },
  heading: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 5,
    paddingBottom: 2,
    borderBottomWidth: 0.75,
    borderBottomColor: MUTED,
  },
  entry: { marginBottom: 7 },
  entryTitle: { fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  entryMeta: { fontSize: 9.5, color: MUTED },
  bullet: { marginLeft: 8, marginTop: 1.5 },
  body: { marginTop: 1.5 },
  skillLine: { marginBottom: 2 },
  bold: { fontFamily: "Helvetica-Bold" },
});

function Heading({ children }: { children: string }) {
  return <Text style={styles.heading}>{children}</Text>;
}

function Bullets({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item, i) => (
        <Text key={i} style={styles.bullet}>
          {`• ${item}`}
        </Text>
      ))}
    </>
  );
}

export function CvPdf({ model }: { model: CvModel }) {
  const contact = contactLines(model);
  const headline = headlineLine(model);

  return (
    <Document
      title={`${model.name} — CV${model.targetRole ? ` (${model.targetRole})` : ""}`}
      author={model.name}
      subject={model.headline ?? "Curriculum Vitae"}
      keywords={model.skills.flatMap((g) => g.names).join(", ")}
      creator={model.name}
      producer={model.name}
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{model.name}</Text>
        {headline ? <Text style={styles.headline}>{headline}</Text> : null}
        {contact.map((line, l) => (
          <Text key={l} style={styles.contact}>
            {line.map((item, i) => (
              <Text key={i}>
                {i > 0 ? "  |  " : ""}
                {item.url ? (
                  <Link src={item.url} style={styles.link}>
                    {item.text}
                  </Link>
                ) : (
                  item.text
                )}
              </Text>
            ))}
          </Text>
        ))}

        {model.summary ? (
          <View>
            <Heading>{SECTION.summary}</Heading>
            <Text>{model.summary}</Text>
          </View>
        ) : null}

        {model.experience.length > 0 ? (
          <View>
            <Heading>{SECTION.experience}</Heading>
            {model.experience.map((role, i) => (
              <View key={i} style={styles.entry} wrap={false}>
                <Text style={styles.entryTitle}>{role.title}</Text>
                <Text style={styles.entryMeta}>
                  {[role.organization, role.location, dateRange(role.start, role.end)].filter(Boolean).join("  |  ")}
                </Text>
                {role.highlights.length > 0 ? (
                  <Bullets items={role.highlights} />
                ) : (
                  <Text style={styles.body}>{role.description}</Text>
                )}
                {role.skills.length > 0 ? (
                  <Text style={styles.body}>
                    <Text style={styles.bold}>Tools: </Text>
                    {role.skills.join(", ")}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {model.projects.length > 0 ? (
          <View>
            <Heading>{SECTION.projects}</Heading>
            {model.projects.map((project, i) => (
              <View key={i} style={styles.entry} wrap={false}>
                <Text style={styles.entryTitle}>{project.name}</Text>
                <Text style={styles.entryMeta}>
                  {project.organization}
                  {"  |  "}
                  <Link src={project.caseStudyUrl} style={styles.link}>
                    {displayUrl(project.caseStudyUrl)}
                  </Link>
                  {project.liveUrl ? "  |  " : ""}
                  {project.liveUrl ? (
                    <Link src={project.liveUrl} style={styles.link}>
                      {displayUrl(project.liveUrl)}
                    </Link>
                  ) : null}
                </Text>
                <Text style={styles.body}>{project.description}</Text>
                <Bullets items={project.impacts} />
                {project.techStack.length > 0 ? (
                  <Text style={styles.body}>
                    <Text style={styles.bold}>Stack: </Text>
                    {project.techStack.join(", ")}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {model.education.length > 0 ? (
          <View>
            <Heading>{SECTION.education}</Heading>
            {model.education.map((e, i) => (
              <View key={i} style={styles.entry} wrap={false}>
                <Text style={styles.entryTitle}>{e.qualification}</Text>
                <Text style={styles.entryMeta}>
                  {[e.institution, dateRange(e.start, e.end, e.expectedGraduation)].join("  |  ")}
                </Text>
                {e.honors ? <Text style={styles.body}>{e.honors}</Text> : null}
                {e.coursework.length > 0 ? (
                  <Text style={styles.body}>
                    <Text style={styles.bold}>Relevant coursework: </Text>
                    {e.coursework.join(", ")}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {model.skills.length > 0 ? (
          <View>
            <Heading>{SECTION.skills}</Heading>
            {model.skills.map((group, i) => (
              <Text key={i} style={styles.skillLine}>
                <Text style={styles.bold}>{`${group.category}: `}</Text>
                {group.names.join(", ")}
              </Text>
            ))}
          </View>
        ) : null}

        {model.certifications.length > 0 ? (
          <View>
            <Heading>{SECTION.certifications}</Heading>
            {model.certifications.map((c, i) => (
              <Text key={i} style={styles.skillLine}>
                <Text style={styles.bold}>{c.title}</Text>
                {[c.issuer, monthYear(c.date)].filter(Boolean).map((part) => `  |  ${part}`).join("")}
                {c.url ? "  |  " : ""}
                {c.url ? (
                  <Link src={c.url} style={styles.link}>
                    {displayUrl(c.url)}
                  </Link>
                ) : null}
              </Text>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export async function renderCvPdf(model: CvModel): Promise<Buffer> {
  return renderToBuffer(<CvPdf model={model} />);
}
