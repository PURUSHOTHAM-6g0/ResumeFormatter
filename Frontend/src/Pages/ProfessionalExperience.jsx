import { Page, Text, View, StyleSheet } from "@react-pdf/renderer"

// Create styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 60,
    fontSize: 12,
    fontFamily: "Helvetica",
  },
  section: {
    marginBottom: 10,
  },
  heading: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  experienceItem: {
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    marginBottom: 5,
  },
  bulletColumn: {
    width: 20,
    alignItems: "center",
  },
  bulletWrapper: {
    paddingTop: 4,
  },
  labelColumn: {
    width: 130,
  },
  valueColumn: {
    flex: 1,
    paddingRight: 10,
  },
  squareBullet: {
    width: 3,
    height: 3,
    backgroundColor: "black",
  },
  labelText: {
    fontWeight: "bold",
  },
  valueText: {
    fontWeight: "normal",
  },
  responsibilitiesHeading: {
    fontWeight: "bold",
    marginTop: 5,
    marginBottom: 5,
    marginLeft: 20,
  },
  responsibilityRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  responsibilityBulletColumn: {
    width: 20,
    alignItems: "center",
  },
  responsibilityTextColumn: {
    flex: 1,
    paddingRight: 10,
  },
  educationSection: {
    marginBottom: 30,
  },
  educationItem: {
    marginBottom: 10,
  },
  errorContainer: {
    padding: 40,
    textAlign: "center",
    color: "red",
  },
  errorText: {
    fontSize: 16,
    marginBottom: 10,
  },
  // New style for education bullet points
  educationBulletRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  educationBulletColumn: {
    width: 20,
    alignItems: "center",
  },
  educationTextColumn: {
    flex: 1,
    paddingRight: 10,
  },
})

// Safe text rendering function
const SafeText = ({ children, style = {} }) => {
  try {
    if (children === null || children === undefined) {
      return <Text style={style}></Text>
    }
    const safeText = String(children).trim()
    return <Text style={style}>{safeText}</Text>
  } catch (error) {
    console.error("SafeText error:", error)
    return <Text style={style}>Error rendering text</Text>
  }
}

// Safe View component
const SafeView = ({ children, style = {} }) => {
  try {
    return <View style={style}>{children}</View>
  } catch (error) {
    console.error("SafeView error:", error)
    return (
      <View style={style}>
        <Text>Error rendering content</Text>
      </View>
    )
  }
}

// Create a wrapper component for bullet rows that ensures they stay together
const BulletRow = ({ label, value }) => {
  try {
    if (!label || !value) return null;

    // Strip all trailing punctuation and trim
    let cleanLabel = String(label).replace(/[:;,.\s]+$/, "").trim();

    // Also strip any commas or colons anywhere in label to be safe
    cleanLabel = cleanLabel.replace(/[:,]/g, "");

    return (
      <SafeView style={styles.row} wrap={false}>
        <SafeView style={styles.bulletColumn}>
          <SafeView style={styles.bulletWrapper}>
            <SafeView style={styles.squareBullet} />
          </SafeView>
        </SafeView>
        <SafeView style={styles.labelColumn}>
          <SafeText style={styles.labelText}>{cleanLabel + ":"}</SafeText>
        </SafeView>
        <SafeView style={styles.valueColumn}>
          <SafeText style={styles.valueText}>{value}</SafeText>
        </SafeView>
      </SafeView>
    );
  } catch (error) {
    console.error("BulletRow error:", error);
    return null;
  }
};



// Create a wrapper component for responsibility items
const ResponsibilityRow = ({ text }) => {
  try {
    if (!text || typeof text !== "string" || !text.trim()) return null

    return (
      <SafeView style={styles.responsibilityRow} wrap={false}>
        <SafeView style={styles.responsibilityBulletColumn}>
          <SafeView style={styles.bulletWrapper}>
            <SafeView style={styles.squareBullet} />
          </SafeView>
        </SafeView>
        <SafeView style={styles.responsibilityTextColumn}>
          <SafeText style={styles.valueText}>{text}</SafeText>
        </SafeView>
      </SafeView>
    )
  } catch (error) {
    console.error("ResponsibilityRow error:", error)
    return null
  }
}

// Create a simple education bullet row without label
const EducationBulletRow = ({ text }) => {
  try {
    if (!text || typeof text !== "string" || !text.trim()) return null

    return (
      <SafeView style={styles.educationBulletRow} wrap={false}>
        <SafeView style={styles.educationBulletColumn}>
          <SafeView style={styles.bulletWrapper}>
            <SafeView style={styles.squareBullet} />
          </SafeView>
        </SafeView>
        <SafeView style={styles.educationTextColumn}>
          <SafeText style={styles.valueText}>{text}</SafeText>
        </SafeView>
      </SafeView>
    )
  } catch (error) {
    console.error("EducationBulletRow error:", error)
    return null
  }
}

// Reorganize the second page to have Professional Experience first, then Education
const ProfessionalExperiencePage = ({ data }) => {
  try {
    // Ensure data exists and has the right structure
    if (!data || typeof data !== "object") {
      return (
        <Page size="A4" style={styles.page}>
          <SafeView style={styles.errorContainer}>
            <SafeText style={styles.errorText}>Error: Invalid Resume Data</SafeText>
            <SafeText>Unable to render professional experience page.</SafeText>
          </SafeView>
        </Page>
      )
    }

    const experiences = Array.isArray(data.experience_data) ? data.experience_data : []

    // Separate experiences with and without responsibilities
    const experiencesWithResp = experiences.filter((exp) => {
      try {
        return (
          exp &&
          typeof exp === "object" &&
          Array.isArray(exp.responsibilities) &&
          exp.responsibilities.length > 0 &&
          exp.responsibilities.some((resp) => resp && resp.trim() && resp !== "Not available")
        )
      } catch (error) {
        console.error("Error filtering experience with responsibilities:", error)
        return false
      }
    })

    const experiencesWithoutResp = experiences.filter((exp) => {
      try {
        return (
          exp &&
          typeof exp === "object" &&
          (!Array.isArray(exp.responsibilities) ||
            exp.responsibilities.length === 0 ||
            !exp.responsibilities.some((resp) => resp && resp.trim() && resp !== "Not available"))
        )
      } catch (error) {
        console.error("Error filtering experience without responsibilities:", error)
        return false
      }
    })

    // Combine the arrays with experiences that have responsibilities first
    const sortedExperiences = [...experiencesWithResp, ...experiencesWithoutResp]

    return (
      <Page size="A4" style={styles.page}>
        {/* Professional Experience Section - Now appears FIRST */}
        <SafeView style={styles.section}>
          <SafeText style={styles.heading}>Professional Experience</SafeText>

          {sortedExperiences.map((exp, index) => {
            try {
              if (!exp || typeof exp !== "object") return null

              return (
                <SafeView key={`exp-${index}`} style={styles.experienceItem}>
                  {/* Company */}
                  {exp.company && exp.company !== "Not available" && exp.company.trim() && (
                    <BulletRow label="Company" value={exp.company} />
                  )}

                  {/* Date */}
                  {exp.startDate &&
                    exp.endDate &&
                    exp.startDate !== "Not available" &&
                    exp.endDate !== "Not available" &&
                    exp.startDate.trim() &&
                    exp.endDate.trim() && <BulletRow label="Date" value={`${exp.startDate} to ${exp.endDate}`} />}

                  {/* Role */}
                  {exp.role && exp.role !== "Not available" && exp.role.trim() && (
                    <BulletRow label="Role" value={exp.role} />
                  )}

                  {/* Client Engagement */}
                  {exp.clientEngagement && exp.clientEngagement !== "Not available" && exp.clientEngagement.trim() && (
                    <BulletRow label="Client Engagement" value={exp.clientEngagement} />
                  )}

                  {/* Program */}
                  {exp.program && exp.program !== "Not available" && exp.program.trim() && (
                    <BulletRow label="Program" value={exp.program} />
                  )}

                  {/* Responsibilities - Only show if they exist and are not empty */}
                  {Array.isArray(exp.responsibilities) &&
                    exp.responsibilities.length > 0 &&
                    exp.responsibilities.some((resp) => resp && resp.trim() && resp !== "Not available") && (
                      <SafeView>
                        <SafeText style={styles.responsibilitiesHeading}>RESPONSIBILITIES:</SafeText>
                        {exp.responsibilities.map((resp, respIndex) => {
                          if (!resp || resp === "Not available" || !resp.trim()) return null
                          return <ResponsibilityRow key={`resp-${index}-${respIndex}`} text={resp} />
                        })}
                      </SafeView>
                    )}
                </SafeView>
              )
            } catch (error) {
              console.error("Error rendering experience item:", error)
              return null
            }
          })}

          {sortedExperiences.length === 0 && <SafeText>No professional experience details available.</SafeText>}
        </SafeView>

        {/* Education Section - Now appears AFTER professional experience with only main heading */}
        {data.education &&
          typeof data.education === "string" &&
          data.education !== "Not available" &&
          data.education.trim() && (
            <SafeView style={styles.educationSection}>
              <SafeText style={styles.heading}>Education</SafeText>
              <SafeView style={styles.educationItem}>
                {/* Use EducationBulletRow instead of BulletRow to avoid duplicate "Education:" label */}
                <EducationBulletRow
                  text={Array.isArray(data.education) ? data.education.join(", ") : String(data.education)}
                />
              </SafeView>
            </SafeView>
          )}
      </Page>
    )
  } catch (error) {
    console.error("Error rendering ProfessionalExperiencePage:", error)
    return (
      <Page size="A4" style={styles.page}>
        <SafeView style={styles.errorContainer}>
          <SafeText style={styles.errorText}>Error: Failed to render page</SafeText>
          <SafeText>Please try again or contact support.</SafeText>
        </SafeView>
      </Page>
    )
  }
}

export default ProfessionalExperiencePage


















