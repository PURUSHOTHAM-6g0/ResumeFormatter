import { Document, Page, Text, View, StyleSheet, Font, Image, Link } from "@react-pdf/renderer"
import ProfessionalExperiencePage from "./ProfessionalExperience"

// Font registration with error handling
try {
  Font.register({
    family: "Helvetica",
    src: "https://fonts.gstatic.com/s/opensans/v17/mem8YaGs126MiZpBA-UFVZ0e.ttf",
  })
} catch (error) {
  console.warn("Font registration failed:", error)
}

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
    minHeight: "100%",
  },
  header: {
    flexDirection: "column",
    backgroundColor: "#000000",
    color: "white",
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerTop: {
    flexDirection: "row",
    width: "100%",
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  logoContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  logo: {
    width: 30,
    height: 30,
  },
  name: {
    fontSize: 24,
    fontWeight: 900,
    textTransform: "uppercase",
    color: "white",
  },
  linksContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  linkItem: {
    marginHorizontal: 8,
    fontSize: 9,
    color: "#66ccff",
    textDecoration: "none",
  },
  linkSeparator: {
    marginHorizontal: 4,
    fontSize: 9,
    color: "#999999",
  },
  columnsContainer: {
    flexDirection: "row",
    width: "100%",
    flex: 1,
    minHeight: 650,
    maxHeight: 650,
  },
  leftPanel: {
    backgroundColor: "#166a6a",
    color: "white",
    paddingTop: 20,
    paddingBottom: 30,
    paddingLeft: 20,
    paddingRight: 15,
    fontSize: 9,
    marginLeft: 20,
    marginTop: 20,
    marginBottom: 20,
    width: "40%",
    minHeight: "100%",
    maxHeight: 650,
    overflow: "hidden",
  },
  rightPanel: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingLeft: 15,
    paddingRight: 20,
    fontSize: 9,
    width: "60%",
    marginRight: 20,
    marginTop: 20,
    marginBottom: 20,
    minHeight: "100%",
    maxHeight: 650,
    overflow: "hidden",
  },
  leftPanelContent: {
    paddingBottom: 20,
  },
  rightPanelContent: {
    paddingBottom: 20,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "white",
  },
  h2: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 0,
    marginBottom: 12,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 8,
    paddingLeft: 15,
    position: "relative",
    fontSize: 11,
    lineHeight: 1.15,
  },
  squareBullet: {
    position: "absolute",
    left: 0,
    top: 3.7,
    width: 3,
    height: 3,
    backgroundColor: "black",
    marginRight: 8,
  },
  leftPanelSquareBullet: {
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
    lineHeight: 1.15,
  },
  leftPanelListItem: {
    flexDirection: "row",
    marginBottom: 8,
    paddingLeft: 20,
    position: "relative",
    fontSize: 11,
    lineHeight: 1.2,
  },
  skillContainer: {
    marginBottom: 10,
  },
  skillLine: {
    fontSize: 11,
    color: "#fff",
    lineHeight: 1.2,
    flexWrap: "wrap",
  },
  skillCategory: {
    fontWeight: "bold",
    color: "#fff",
  },
  skillText: {
    fontWeight: "normal",
    color: "#fff",
  },
  sectionWrapper: {
    marginBottom: 20,
    orphans: 2,
    widows: 2,
  },
  experienceWrapper: {
    break: false,
    marginBottom: 10,
  },
  certificationItem: {
    flexDirection: "row",
    marginBottom: 8,
    paddingLeft: 20,
    position: "relative",
    fontSize: 11,
    lineHeight: 1.2,
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
})

// Safe text rendering function with comprehensive error handling
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

// Component to render links in PDF header
const HeaderLinksSection = ({ links }) => {
  if (!links || !Array.isArray(links) || links.length === 0) {
    return null
  }

  return (
    <SafeView style={styles.linksContainer}>
      {links.map((link, index) => (
        <SafeView key={index} style={{ flexDirection: "row", alignItems: "center" }}>
          {index > 0 && <SafeText style={styles.linkSeparator}>|</SafeText>}
          <Link src={link.url} style={styles.linkItem}>
            <SafeText>{link.type}</SafeText>
          </Link>
        </SafeView>
      ))}
    </SafeView>
  )
}

const ResumePDF = ({ data }) => {
  const ustLogoBase64 =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAABCCAYAAAAL1LXDAAAAAXNSR0IArs4c6QAAA7JJREFUaEPtW4111DAMliYANmgngE4ANwFlArgJoBPQm4DeBLQTlE5AmYAyAd2AbiDyBfle4vNfciZx3tnv3evrXWLpk+RPsuKwiJyQezwx85Pnt/ZrEXlORPjsDWZ+DN079jeV+YGIXhLRK0s+ZD4Q0R0z3zv1EpHfROQCfc/MqwjgayJ67wHMY0G57lPHfCYigE0ZAL9hZui4G7wEwCICT373RVMEPYCvTMQVD1g9+3MkWGOLHeglAPYtuZSw7l6DdX1eNGAROW/I6TYhZOFB8JCPgEFg70DCpQO+IqKPHsDb5vvLbibR8Aep4R6TPUBcl2aO0gGDqN4MzQIK/CsR3SyKpRvFvWlPmdeZa0NLoHQPfyKiLwEAMAi8mAy8dMBYh38S6BgVIUD/wN+GjVFtOUfRgKFxU0qGiMuHC6xtvN8rcYsHrKBReKDaGjrg+Stm3iyCpbvoRnraTHHNzGv8swgPG621EEGOdaaqiPvh6YsQ4AdmPgtNEkobTRhl3S1Z3kZ4o8B4PTDUVyHAj8x8GgE8qjAYuhAjOoDJ4XGUoTCAr7zENBsARq2Ki10D2ypnjovsYtA8eJEZ2ElKUyGy1u8AOET7yGcAvdf5EBEUBCgMXCPaPBhijGbPjiYD9OwxrmsOEYG3EXluvSIX4Ka2c6CtEwDH+okRx9quYYcAtNYruhy74l/1uHBFnrZ/ANaXwrYtsQS6HmP1PE0Jv4S1ieXmY2TTv/rVlJ/PFKTd47JFrA3glH1nKvjediz1Jvu6hMgbOnVLwrvUEdmZpE4eZfbUiTTyEMoI6RzjDDV2L1ceWM2A4NBVyNqeFRHkW4AOpZuQQcA70KvNNnvFwQgBmHDb7SrkcIdFXAALb8fybPe2Vi9l9l2W8VZDCvytWtZmPUMY2I6hTg027HMaQMtLEBka8aaPBfnmg0iDXt9ceiWXf0r5NCW4nIYycyUD/h/C55izAp7D6lPKrB6e0tpzyKoensPqU8qsHp7S2nPIqh6ew+pTyqwentLac8g6Pg9r72jMo4uQg9Dq6Z2PmsObLpnoS+fsGxkZWfvSOY1VAWeyZvVwJkMePM1RhnToBBu6lb5TNDd6jsJldTw99B4sOdhNB0wQzMORxx1ZHqkM1V0f08aa8l6DLxFw6LBaNC1WwN0QKzSkq4cdPOCtA2pI15D2HxCZKy3VNVzX8L8jxM53rpZIWt634bqe9h29WBzgoaWofX0FXHpaqh4eaIEa0sce0uh4+N79w2E0HOld1PgLGa5FbiKSBQEAAAAASUVORK5CYII="

  // Comprehensive data validation with error boundaries
  if (!data || typeof data !== "object") {
    console.error("Invalid data passed to ResumePDF:", data)
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <SafeView style={styles.errorContainer}>
            <SafeText style={styles.errorText}>Error: Invalid Resume Data</SafeText>
            <SafeText>Please try uploading your resume again.</SafeText>
          </SafeView>
        </Page>
      </Document>
    )
  }

  try {
    // Safely get name with fallback
    const safeName = (data.name && typeof data.name === "string" && data.name.trim()) || "Unknown"

    return (
      <Document>
        <Page size="A4" style={styles.page} wrap>
          <SafeView style={styles.container}>
            {/* Header with integrated links */}
            <SafeView style={styles.header}>
              <SafeView style={styles.headerTop}>
                <SafeView style={styles.logoContainer}>
                  <Image src={ustLogoBase64 || "/placeholder.svg"} style={styles.logo} />
                </SafeView>
                <SafeText style={styles.name}>{safeName}</SafeText>
              </SafeView>

              {/* Links directly in the header */}
              <HeaderLinksSection links={data.links} />
            </SafeView>

            {/* CONTENT: two-column layout with fixed height */}
            <SafeView style={styles.columnsContainer}>
              {/* Left Column */}
              <SafeView style={styles.leftPanel}>
                <SafeView style={styles.leftPanelContent}>
                  {/* Technical Expertise */}
                  {Array.isArray(data.skills) && data.skills.length > 0 && (
                    <SafeView style={styles.sectionWrapper}>
                      <SafeText style={styles.sectionHeading}>Technical Expertise</SafeText>
                      {data.skills.map((group, i) => {
                        try {
                          if (!group || typeof group !== "object") return null
                          const entries = Object.entries(group)
                          if (entries.length === 0) return null
                          const [category, skills] = entries[0]
                          if (!category || !skills) return null

                          return (
                            <SafeView key={`skill-${i}`} style={styles.skillContainer}>
                              <SafeView style={styles.leftPanelListItem}>
                                <SafeView style={styles.leftPanelSquareBullet} />
                                <SafeView style={{ flex: 1 }}>
                                  <Text style={styles.skillLine}>
                                    <Text style={styles.skillCategory}>{category}: </Text>
                                    <Text style={styles.skillText}>
                                      {Array.isArray(skills) ? skills.join(", ") : String(skills || "")}
                                    </Text>
                                  </Text>
                                </SafeView>
                              </SafeView>
                            </SafeView>
                          )
                        } catch (error) {
                          console.error("Error rendering skill:", error)
                          return null
                        }
                      })}
                    </SafeView>
                  )}

                  {/* Certifications */}
                  {Array.isArray(data.certifications) && data.certifications.length > 0 && (
                    <SafeView style={styles.sectionWrapper}>
                      <SafeText style={styles.sectionHeading}>Certifications</SafeText>
                      {data.certifications.map((certificate, i) => {
                        try {
                          if (!certificate || typeof certificate !== "string") return null
                          return (
                            <SafeView key={`cert-${i}`} style={styles.certificationItem}>
                              <SafeView style={styles.leftPanelSquareBullet} />
                              <SafeView style={{ flex: 1 }}>
                                <SafeText style={styles.skillText}>{certificate}</SafeText>
                              </SafeView>
                            </SafeView>
                          )
                        } catch (error) {
                          console.error("Error rendering certification:", error)
                          return null
                        }
                      })}
                    </SafeView>
                  )}
                </SafeView>
              </SafeView>

              {/* Right Column */}
              <SafeView style={styles.rightPanel}>
                <SafeView style={styles.rightPanelContent}>
                  <SafeText style={styles.h2}>Professional Experience</SafeText>
                  {Array.isArray(data.professional_experience) &&
                    data.professional_experience.map((exp, i) => {
                      try {
                        if (!exp || typeof exp !== "string") return null
                        return (
                          <SafeView key={`prof-exp-${i}`} style={styles.experienceWrapper}>
                            <SafeView style={styles.listItem}>
                              <SafeView style={styles.squareBullet} />
                              <SafeText style={styles.listItemText}>{exp}</SafeText>
                            </SafeView>
                          </SafeView>
                        )
                      } catch (error) {
                        console.error("Error rendering professional experience:", error)
                        return null
                      }
                    })}
                </SafeView>
              </SafeView>
            </SafeView>
          </SafeView>
        </Page>

        {/* Second Page: Professional Experience first, then Education */}
        <ProfessionalExperiencePage data={data} />
      </Document>
    )
  } catch (error) {
    console.error("Error rendering ResumePDF:", error)
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <SafeView style={styles.errorContainer}>
            <SafeText style={styles.errorText}>Error: Failed to render PDF</SafeText>
            <SafeText>Please try again or contact support.</SafeText>
          </SafeView>
        </Page>
      </Document>
    )
  }
}

export default ResumePDF










// import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer"
// import ProfessionalExperiencePage from "./ProfessionalExperience"

// // Font registration with error handling
// try {
//   Font.register({
//     family: "Helvetica",
//     src: "https://fonts.gstatic.com/s/opensans/v17/mem8YaGs126MiZpBA-UFVZ0e.ttf",
//   })
// } catch (error) {
//   console.warn("Font registration failed:", error)
// }

// const styles = StyleSheet.create({
//   page: {
//     fontFamily: "Helvetica",
//     backgroundColor: "#f2f2f2",
//     padding: 0,
//   },
//   container: {
//     width: "100%",
//     margin: "0 auto",
//     backgroundColor: "white",
//     minHeight: "100%",
//   },
//   header: {
//     flexDirection: "row",
//     height: 80,
//     backgroundColor: "#000000",
//     color: "white",
//     padding: 15,
//     alignItems: "center",
//     justifyContent: "center",
//     position: "relative",
//   },
//   logoContainer: {
//     position: "absolute",
//     left: 15,
//     top: 0,
//     bottom: 0,
//     justifyContent: "center",
//   },
//   logo: {
//     width: 30,
//     height: 30,
//   },
//   name: {
//     fontSize: 24,
//     fontWeight: 900,
//     textTransform: "uppercase",
//     color: "white",
//   },
//   columnsContainer: {
//     flexDirection: "row",
//     width: "100%",
//     flex: 1,
//     minHeight: 650,
//     maxHeight: 650,
//   },
//   leftPanel: {
//     backgroundColor: "#166a6a",
//     color: "white",
//     paddingTop: 20,
//     paddingBottom: 30,
//     paddingLeft: 20,
//     paddingRight: 15,
//     fontSize: 9,
//     marginLeft: 20,
//     marginTop: 20,
//     marginBottom: 20,
//     width: "40%",
//     minHeight: "100%",
//     maxHeight: 650,
//     overflow: "hidden",
//   },
//   rightPanel: {
//     paddingTop: 20,
//     paddingBottom: 30,
//     paddingLeft: 15,
//     paddingRight: 20,
//     fontSize: 9,
//     width: "60%",
//     marginRight: 20,
//     marginTop: 20,
//     marginBottom: 20,
//     minHeight: "100%",
//     maxHeight: 650,
//     overflow: "hidden",
//   },
//   leftPanelContent: {
//     paddingBottom: 20,
//   },
//   rightPanelContent: {
//     paddingBottom: 20,
//   },
//   sectionHeading: {
//     fontSize: 16,
//     fontWeight: "bold",
//     marginBottom: 12,
//     color: "white",
//   },
//   h2: {
//     fontSize: 18,
//     fontWeight: "bold",
//     marginTop: 0,
//     marginBottom: 12,
//   },
//   listItem: {
//     flexDirection: "row",
//     marginBottom: 8,
//     paddingLeft: 15,
//     position: "relative",
//     fontSize: 11,
//     lineHeight: 1.15,
//   },
//   squareBullet: {
//     position: "absolute",
//     left: 0,
//     top: 3.7,
//     width: 3,
//     height: 3,
//     backgroundColor: "black",
//     marginRight: 8,
//   },
//   leftPanelSquareBullet: {
//     position: "absolute",
//     left: 0,
//     top: 3.7,
//     width: 3,
//     height: 3,
//     backgroundColor: "white",
//     marginRight: 8,
//   },
//   listItemText: {
//     flex: 1,
//     textAlign: "justify",
//     lineHeight: 1.15,
//   },
//   leftPanelListItem: {
//     flexDirection: "row",
//     marginBottom: 8,
//     paddingLeft: 20,
//     position: "relative",
//     fontSize: 11,
//     lineHeight: 1.2,
//   },
//   skillContainer: {
//     marginBottom: 10,
//   },
//   skillLine: {
//     fontSize: 11,
//     color: "#fff",
//     lineHeight: 1.2,
//     flexWrap: "wrap",
//   },
//   skillCategory: {
//     fontWeight: "bold",
//     color: "#fff",
//   },
//   skillText: {
//     fontWeight: "normal",
//     color: "#fff",
//   },
//   sectionWrapper: {
//     marginBottom: 20,
//     orphans: 2,
//     widows: 2,
//   },
//   experienceWrapper: {
//     break: false,
//     marginBottom: 10,
//   },
//   certificationItem: {
//     flexDirection: "row",
//     marginBottom: 8,
//     paddingLeft: 20,
//     position: "relative",
//     fontSize: 11,
//     lineHeight: 1.2,
//   },
//   errorContainer: {
//     padding: 40,
//     textAlign: "center",
//     color: "red",
//   },
//   errorText: {
//     fontSize: 16,
//     marginBottom: 10,
//   },
// })

// // Safe text rendering function with comprehensive error handling
// const SafeText = ({ children, style = {} }) => {
//   try {
//     if (children === null || children === undefined) {
//       return <Text style={style}></Text>
//     }

//     const safeText = String(children).trim()
//     return <Text style={style}>{safeText}</Text>
//   } catch (error) {
//     console.error("SafeText error:", error)
//     return <Text style={style}>Error rendering text</Text>
//   }
// }

// // Safe View component
// const SafeView = ({ children, style = {} }) => {
//   try {
//     return <View style={style}>{children}</View>
//   } catch (error) {
//     console.error("SafeView error:", error)
//     return (
//       <View style={style}>
//         <Text>Error rendering content</Text>
//       </View>
//     )
//   }
// }

// const ResumePDF = ({ data }) => {
//   const ustLogoBase64 =
//     "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAABCCAYAAAAL1LXDAAAAAXNSR0IArs4c6QAAA7JJREFUaEPtW4111DAMliYANmgngE4ANwFlArgJoBPQm4DeBLQTlE5AmYAyAd2AbiDyBfle4vNfciZx3tnv3evrXWLpk+RPsuKwiJyQezwx85Pnt/ZrEXlORPjsDWZ+DN079jeV+YGIXhLRK0s+ZD4Q0R0z3zv1EpHfROQCfc/MqwjgayJ67wHMY0G57lPHfCYigE0ZAL9hZui4G7wEwCICT373RVMEPYCvTMQVD1g9+3MkWGOLHeglAPYtuZSw7l6DdX1eNGAROW/I6TYhZOFB8JCPgEFg70DCpQO+IqKPHsDb5vvLbibR8Aep4R6TPUBcl2aO0gGDqN4MzQIK/CsR3SyKpRvFvWlPmdeZa0NLoHQPfyKiLwEAMAi8mAy8dMBYh38S6BgVIUD/wN+GjVFtOUfRgKFxU0qGiMuHC6xtvN8rcYsHrKBReKDaGjrg+Stm3iyCpbvoRnraTHHNzGv8swgPG621EEGOdaaqiPvh6YsQ4AdmPgtNEkobTRhl3S1Z3kZ4o8B4PTDUVyHAj8x8GgE8qjAYuhAjOoDJ4XGUoTCAr7zENBsARq2Ki10D2ypnjovsYtA8eJEZ2ElKUyGy1u8AOET7yGcAvdf5EBEUBCgMXCPaPBhijGbPjiYD9OwxrmsOEYG3EXluvSIX4Ka2c6CtEwDH+okRx9quYYcAtNYruhy74l/1uHBFnrZ/ANaXwrYtsQS6HmP1PE0Jv4S1ieXmY2TTv/rVlJ/PFKTd47JFrA3glH1nKvjediz1Jvu6hMgbOnVLwrvUEdmZpE4eZfbUiTTyEMoI6RzjDDV2L1ceWM2A4NBVyNqeFRHkW4AOpZuQQcA70KvNNnvFwQgBmHDb7SrkcIdFXAALb8fybPe2Vi9l9l2W8VZDCvytWtZmPUMY2I6hTg027HMaQMtLEBka8aaPBfnmg0iDXt9ceiWXf0r5NCW4nIYycyUD/h/C55izAp7D6lPKrB6e0tpzyKoensPqU8qsHp7S2nPIqh6ew+pTyqwentLac8g6Pg9r72jMo4uQg9Dq6Z2PmsObLpnoS+fsGxkZWfvSOY1VAWeyZvVwJkMePM1RhnToBBu6lb5TNDd6jsJldTw99B4sOdhNB0wQzMORxx1ZHqkM1V0f08aa8l6DLxFw6LBaNC1WwN0QKzSkq4cdPOCtA2pI15D2HxCZKy3VNVzX8L8jxM53rpZIWt634bqe9h29WBzgoaWofX0FXHpaqh4eaIEa0sce0uh4+N79w2E0HOld1PgLGa5FbiKSBQEAAAAASUVORK5CYII="

//   // Comprehensive data validation with error boundaries
//   if (!data || typeof data !== "object") {
//     console.error("Invalid data passed to ResumePDF:", data)
//     return (
//       <Document>
//         <Page size="A4" style={styles.page}>
//           <SafeView style={styles.errorContainer}>
//             <SafeText style={styles.errorText}>Error: Invalid Resume Data</SafeText>
//             <SafeText>Please try uploading your resume again.</SafeText>
//           </SafeView>
//         </Page>
//       </Document>
//     )
//   }

//   try {
//     // Safely get name with fallback
//     const safeName = (data.name && typeof data.name === "string" && data.name.trim()) || "Unknown"

//     return (
//       <Document>
//         <Page size="A4" style={styles.page} wrap>
//           <SafeView style={styles.container}>
//             {/* Header */}
//             <SafeView style={styles.header}>
//               <SafeView style={styles.logoContainer}>
//                 <Image src={ustLogoBase64 || "/placeholder.svg"} style={styles.logo} />
//               </SafeView>
//               <SafeText style={styles.name}>{safeName}</SafeText>
//             </SafeView>

//             {/* CONTENT: two-column layout with fixed height */}
//             <SafeView style={styles.columnsContainer}>
//               {/* Left Column */}
//               <SafeView style={styles.leftPanel}>
//                 <SafeView style={styles.leftPanelContent}>
//                   {/* Technical Expertise */}
//                   {Array.isArray(data.skills) && data.skills.length > 0 && (
//                     <SafeView style={styles.sectionWrapper}>
//                       <SafeText style={styles.sectionHeading}>Technical Expertise</SafeText>
//                       {data.skills.map((group, i) => {
//                         try {
//                           if (!group || typeof group !== "object") return null
//                           const entries = Object.entries(group)
//                           if (entries.length === 0) return null
//                           const [category, skills] = entries[0]
//                           if (!category || !skills) return null

//                           return (
//                             <SafeView key={`skill-${i}`} style={styles.skillContainer}>
//                               <SafeView style={styles.leftPanelListItem}>
//                                 <SafeView style={styles.leftPanelSquareBullet} />
//                                 <SafeView style={{ flex: 1 }}>
//                                   <Text style={styles.skillLine}>
//                                     <Text style={styles.skillCategory}>{category}: </Text>
//                                     <Text style={styles.skillText}>
//                                       {Array.isArray(skills) ? skills.join(", ") : String(skills || "")}
//                                     </Text>
//                                   </Text>
//                                 </SafeView>
//                               </SafeView>
//                             </SafeView>
//                           )
//                         } catch (error) {
//                           console.error("Error rendering skill:", error)
//                           return null
//                         }
//                       })}
//                     </SafeView>
//                   )}

//                   {/* Certifications */}
//                   {Array.isArray(data.certifications) && data.certifications.length > 0 && (
//                     <SafeView style={styles.sectionWrapper}>
//                       <SafeText style={styles.sectionHeading}>Certifications</SafeText>
//                       {data.certifications.map((certificate, i) => {
//                         try {
//                           if (!certificate || typeof certificate !== "string") return null
//                           return (
//                             <SafeView key={`cert-${i}`} style={styles.certificationItem}>
//                               <SafeView style={styles.leftPanelSquareBullet} />
//                               <SafeView style={{ flex: 1 }}>
//                                 <SafeText style={styles.skillText}>{certificate}</SafeText>
//                               </SafeView>
//                             </SafeView>
//                           )
//                         } catch (error) {
//                           console.error("Error rendering certification:", error)
//                           return null
//                         }
//                       })}
//                     </SafeView>
//                   )}
//                 </SafeView>
//               </SafeView>

//               {/* Right Column */}
//               <SafeView style={styles.rightPanel}>
//                 <SafeView style={styles.rightPanelContent}>
//                   <SafeText style={styles.h2}>Professional Experience</SafeText>
//                   {Array.isArray(data.professional_experience) &&
//                     data.professional_experience.map((exp, i) => {
//                       try {
//                         if (!exp || typeof exp !== "string") return null
//                         return (
//                           <SafeView key={`prof-exp-${i}`} style={styles.experienceWrapper}>
//                             <SafeView style={styles.listItem}>
//                               <SafeView style={styles.squareBullet} />
//                               <SafeText style={styles.listItemText}>{exp}</SafeText>
//                             </SafeView>
//                           </SafeView>
//                         )
//                       } catch (error) {
//                         console.error("Error rendering professional experience:", error)
//                         return null
//                       }
//                     })}
//                 </SafeView>
//               </SafeView>
//             </SafeView>
//           </SafeView>
//         </Page>

//         {/* Second Page: Professional Experience first, then Education */}
//         <ProfessionalExperiencePage data={data} />
//       </Document>
//     )
//   } catch (error) {
//     console.error("Error rendering ResumePDF:", error)
//     return (
//       <Document>
//         <Page size="A4" style={styles.page}>
//           <SafeView style={styles.errorContainer}>
//             <SafeText style={styles.errorText}>Error: Failed to render PDF</SafeText>
//             <SafeText>Please try again or contact support.</SafeText>
//           </SafeView>
//         </Page>
//       </Document>
//     )
//   }
// }

// export default ResumePDF



















