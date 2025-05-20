import { Page, Text, View, StyleSheet } from "@react-pdf/renderer";

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
    marginBottom: 10,
    padding: 10,
    wrap: false,
  },
  row: {
    flexDirection: "row",
    marginBottom: 5,
    wrap: false,
  },
  bulletContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: 145,
  },
  bullet: {
    width: 3,
    height: 3,
    backgroundColor: "black",
    marginRight: 8,
    marginLeft: 15,
  },
  label: {
    fontWeight: "bold",
    width: 130,
  },
  value: {
    flex: 1,
  },
  responsibilitiesSection: {
    wrap: false,
  },
  responsibilitiesHeading: {
    fontWeight: "bold",
    marginTop: 5,
    marginBottom: 5,
    marginLeft: 26,
  },
  responsibilityItem: {
    flexDirection: "row",
    marginBottom: 5,
    wrap: false,
  },
  responsibilityBulletContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: 26,
  },
  responsibilityBullet: {
    width: 3,
    height: 3,
    backgroundColor: "black",
    marginRight: 8,
    marginLeft: 15,
  },
  responsibilityText: {
    flex: 1,
    marginLeft: 0,
  },
});

const ProfessionalExperiencePage = ({ data }) => {
  const rawExperiences = data.experience_data || [];

  // Sort experiences: ones with invalid responsibilities go to the end
  const experiences = rawExperiences.slice().sort((a, b) => {
    const isInvalid = (resps) =>
      !Array.isArray(resps) || resps.length === 0 || resps === "Not available";
    return isInvalid(a.responsibilities) - isInvalid(b.responsibilities);
  });

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.heading}>Professional Experience</Text>

        {experiences.map((exp, index) => (
          <View key={index} style={styles.experienceItem}>
            <View style={styles.row}>
              <View style={styles.bulletContainer}>
                <View style={styles.bullet} />
                <Text style={styles.label}>Company:</Text>
              </View>
              <Text style={styles.value}>{exp.company}</Text>
            </View>

            <View style={styles.row}>
              <View style={styles.bulletContainer}>
                <View style={styles.bullet} />
                <Text style={styles.label}>Date:</Text>
              </View>
              <Text style={styles.value}>
                {exp.startDate} to {exp.endDate}
              </Text>
            </View>

            <View style={styles.row}>
              <View style={styles.bulletContainer}>
                <View style={styles.bullet} />
                <Text style={styles.label}>Role:</Text>
              </View>
              <Text style={styles.value}>{exp.role}</Text>
            </View>

            {exp.clientEngagement &&
              exp.clientEngagement !== "Not available" && (
                <View style={styles.row}>
                  <View style={styles.bulletContainer}>
                    <View style={styles.bullet} />
                    <Text style={styles.label}>Client Engagement:</Text>
                  </View>
                  <Text style={styles.value}>{exp.clientEngagement}</Text>
                </View>
              )}

            {exp.program && exp.program !== "Not available" && (
              <View style={styles.row}>
                <View style={styles.bulletContainer}>
                  <View style={styles.bullet} />
                  <Text style={styles.label}>Program:</Text>
                </View>
                <Text style={styles.value}>{exp.program}</Text>
              </View>
            )}

            {Array.isArray(exp.responsibilities) &&
              exp.responsibilities.length > 0 &&
              exp.responsibilities !== "Not available" && (
                <View style={styles.responsibilitiesSection}>
                  <Text style={styles.responsibilitiesHeading}>
                    RESPONSIBILITIES:
                  </Text>
                  {exp.responsibilities.map((resp, respIndex) => (
                    <View key={respIndex} style={styles.responsibilityItem}>
                      <View style={styles.responsibilityBulletContainer}>
                        <View style={styles.responsibilityBullet} />
                      </View>
                      <Text style={styles.responsibilityText}>{resp}</Text>
                    </View>
                  ))}
                </View>
              )}
          </View>
        ))}
      </View>
    </Page>
  );
};

export default ProfessionalExperiencePage;
