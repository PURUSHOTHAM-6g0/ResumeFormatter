import React from "react";
import ReactPDF, { Image } from "@react-pdf/renderer";
import ProfessionalExperiencePage from "./ProfessionalExperience";

const { Document, Page, Text, View, StyleSheet, Font } = ReactPDF;

// Font registration
Font.register({
  family: "Helvetica",
  src: "https://fonts.gstatic.com/s/opensans/v17/mem8YaGs126MiZpBA-UFVZ0e.ttf",
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#f2f2f2",
    padding: 0,
  },
  container: {
    width: "100%",
    margin: "0 auto",
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    height: 100,
    backgroundColor: "#000000",
    color: "white",
    padding: 20,
    alignItems: "center",
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "flex-start",
  },
  logo: {
    width: 30,
    height: 30,
  },
  name: {
    fontSize: 24,
    fontWeight: 900,
    margin: 40,
    textTransform: "uppercase",
  },
  content: {
    flexDirection: "row",
    margin: 20,
  },
  leftPanel: {
    backgroundColor: "#166a6a",
    color: "white",
    padding: 20,
    width: "42%",
    height: 700,
    fontSize: 9,
  },
  rightPanel: {
    padding: 20,
    width: "65%",
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  h2: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 0,
    marginBottom: 10,
  },
  paragraph: {
    marginBottom: 10,
    fontSize: 11,
    lineHeight: 1.4,
    textAlign: "justify",
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 8,
    paddingLeft: 15,
    position: "relative",
    fontSize: 11,
    lineHeight: 1.4,
  },
  bullet: {
    position: "absolute",
    left: 0,
    marginRight: 5,
  },
  squareBullet: {
    position: "absolute",
    left: 0,
    top: 3.7,
    width: 3,
    height: 3,
    backgroundColor: "white",
    marginRight: 8,
  },
  listItemText: {
    flex: 1,
    textAlign: "justify",
  },
  leftPanelListItem: {
    flexDirection: "row",
    marginBottom: 1,
    paddingLeft: 20,
    position: "relative",
    fontSize: 11,
    lineHeight: 1.4,
  },
  bold: {
    fontWeight: "bold",
  },
  skillContainer: {
    marginBottom: 6,
  },
  skillLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    fontSize: 11,
    color: "#fff",
  },
  skillCategory: {},
  skillText: {
    fontWeight: "normal",
  },
});

// Page layout wrapper
const PageLayout = ({ children }) => (
  <View style={styles.container}>{children}</View>
);

const ResumePDF = ({ data }) => {
  const experienceChunks = chunkArray(data?.professional_experience || [], 15);
  const ustLogoBase64 =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAABCCAYAAAAL1LXDAAAAAXNSR0IArs4c6QAAA7JJREFUaEPtW4111DAMliYANmgngE4ANwFlArgJoBPQm4DeBLQTlE5AmYAyAd2AbiDyBfle4vNfciZx3tnv3evrXWLpk+RPsuKwiJyQezwx85Pnt/ZrEXlORPjsDWZ+DN079jeV+YGIXhLRK0s+ZD4Q0R0z3zv1EpHfROQCfc/MqwjgayJ67wHMY0G57lPHfCYigE0ZAL9hZui4G7wEwCICT373RVMEPYCvTMQVD1g9+3MkWGOLHeglAPYtuZSw7l6DdX1eNGAROW/I6TYhZOFB8JCPgEFg70DCpQO+IqKPHsDb5vvLbibR8Aep4R6TPUBcl2aO0gGDqN4MzQIK/CsR3SyKpRvFvWlPmdeZa0NLoHQPfyKiLwEAMAi8mAy8dMBYh38S6BgVIUD/wN+GjVFtOUfRgKFxU0qGiMuHC6xtvN8rcYsHrKBReKDaGjrg+Stm3iyCpbvoRnraTHHNzGv8swgPG621EEGOdaaqiPvh6YsQ4AdmPgtNEkobTRhl3S1Z3kZ4o8B4PTDUVyHAj8x8GgE8qjAYuhAjOoDJ4XGUoTCAr7zENBsARq2Ki10D2ypnjovsYtA8eJEZ2ElKUyGy1u8AOET7yGcAvdf5EBEUBCgMXCPaPBhijGbPjiYD9OwxrmsOEYG3EXluvSIX4Ka2c6CtEwDH+okRx9quYYcAtNYruhy74l/1uHBFnrZ/ANaXwrYtsQS6HmP1PE0Jv4S1ieXmY2TTv/rVlJ/PFKTd47JFrA3glH1nKvjediz1Jvu6hMgbOnVLwrvUEdmZpE4eZfbUiTTyEMoI6RzjDDV2L1ceWM2A4NBVyNqeFRHkW4AOpZuQQcA70KvNNnvFwQgBmHDb7SrkcIdFXAALb8fybPe2Vi9l9l2W8VZDCvytWtZmPUMY2I6hTg027HMaQMtLEBka8aaPBfnmg0iDXt9ceiWXf0r5NCW4nIYycyUD/h/C55izAp7D6lPKrB6e0tpzyKoensPqU8qsHp7S2nPIqh6ew+pTyqwentLac8g6Pg9r72jMo4uQg9Dq6Z2PmsObLpnoS+fsGxkZWfvSOY1VAWeyZvVwJkMePM1RhnToBBu6lb5TNDd6jsJldTw99B4sOdhNB0wQzMORxx1ZHqkM1V0f08aa8l6DLxFw6LBaNC1WwN0QKzSkq4cdPOCtA2pI15D2HxCZKy3VNVzX8L8jxM53rpZIWt634bqe9h29WBzgoaWofX0FXHpaqh4eaIEa0sce0uh4+N79w2E0HOld1PgLGa5FbiKSBQEAAAAASUVORK5CYII=";
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PageLayout>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image src={ustLogoBase64} style={styles.logo} />
            </View>
            <Text style={styles.name}>{data.name}</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.leftPanel}>
              {/* Education */}
              <View style={{ marginBottom: 15 }}>
                <Text style={styles.sectionHeading}>Education</Text>
                {Array.isArray(data.education) &&
                data.education.length > 0 &&
                data.education[0] !== "Not available"
                  ? data.education.map((edu, index) => (
                      <View key={index} style={styles.leftPanelListItem}>
                        <View style={styles.squareBullet} />
                        <Text style={styles.listItemText}>{edu}</Text>
                      </View>
                    ))
                  : null}
              </View>

              {/* Technical Expertise */}
              <View style={{ marginBottom: 5 }}>
                <Text style={styles.sectionHeading}>Technical Expertise</Text>
                {Array.isArray(data.skills) &&
                data.skills.length > 0 &&
                data.skills[0] !== "Not available"
                  ? data.skills.map((group, i) => {
                      const [category, skills] = Object.entries(group)[0];
                      return (
                        <View key={i} style={styles.skillContainer}>
                          <View style={styles.leftPanelListItem}>
                            <View style={styles.squareBullet} />
                            <Text style={styles.skillLine}>
                              <Text style={styles.skillCategory}>
                                {category}:{" "}
                              </Text>
                              <Text style={styles.skillText}>
                                {skills.join(", ")}
                              </Text>
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  : null}
              </View>

              {/* Certifications */}
              {Array.isArray(data.certifications) &&
                data.certifications.length > 0 &&
                !data.certifications.includes("Not available") && (
                  <View style={{ marginBottom: 5 }}>
                    <Text style={styles.sectionHeading}>Certifications</Text>
                    {data.certifications.map((certificate, i) => (
                      <View key={i} style={styles.leftPanelListItem}>
                        <View style={styles.squareBullet} />
                        <Text style={styles.listItemText}>{certificate}</Text>
                      </View>
                    ))}
                  </View>
                )}

              {/* Summary */}
              {data.summary && data.summary !== "Not available" && (
                <View style={{ marginBottom: 15 }}>
                  <Text style={styles.sectionHeading}>Summary</Text>
                  <View style={styles.leftPanelListItem}>
                    <View style={styles.squareBullet} />
                    <Text style={styles.listItemText}>{data.summary}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.rightPanel}>
              <Text style={styles.h2}>Professional Experience</Text>
              {experienceChunks[0]?.map((exp, i) => (
                <View key={i} style={styles.listItem}>
                  <View
                    style={{ ...styles.squareBullet, backgroundColor: "black" }}
                  />
                  <Text style={styles.listItemText}>{exp}</Text>
                </View>
              ))}
            </View>
          </View>
        </PageLayout>
      </Page>

      <ProfessionalExperiencePage data={data} />

      {experienceChunks.length > 1
        ? renderAdditionalPages(experienceChunks)
        : null}
    </Document>
  );
};

function chunkArray(array, size) {
  if (
    !array ||
    array === "Not available" ||
    (Array.isArray(array) &&
      (array.length === 0 || array.includes("Not available")))
  ) {
    return [[]];
  }

  const arr = typeof array === "string" ? [array] : array;
  const chunked = [];
  for (let i = 0; i < arr.length; i += size) {
    chunked.push(arr.slice(i + 0, i + size));
  }
  return chunked;
}

function renderAdditionalPages(experienceChunks) {
  const pages = [];

  for (let pageIndex = 1; pageIndex < experienceChunks.length; pageIndex++) {
    pages.push(
      <Page key={`page-${pageIndex + 1}`} size="A4" style={styles.page}>
        <PageLayout>
          <View style={{ ...styles.content, margin: 20 }}>
            <View style={styles.leftPanel}>
              <View style={{ marginBottom: 15 }}>
                <Text style={styles.sectionHeading}>Continued</Text>
                <View style={styles.leftPanelListItem}>
                  <View style={styles.squareBullet} />
                  <Text style={styles.paragraph}>Page {pageIndex + 1}</Text>
                </View>
              </View>
            </View>

            <View style={styles.rightPanel}>
              {experienceChunks[pageIndex].map((exp, i) => (
                <View key={i} style={styles.listItem}>
                  <View
                    style={{ ...styles.squareBullet, backgroundColor: "black" }}
                  />
                  <Text style={styles.listItemText}>{exp}</Text>
                </View>
              ))}
            </View>
          </View>
        </PageLayout>
      </Page>
    );
  }

  return pages;
}

export default ResumePDF;
