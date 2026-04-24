/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { LEGAL_DISCLAIMER } from "@/lib/legal";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  logo: { width: 90, height: 36, objectFit: "contain" },
  title: { fontSize: 16, fontWeight: "bold" },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 4 },
  row: { flexDirection: "row", gap: 12, marginTop: 2 },
  label: { color: "#555", width: 90 },
  value: { flex: 1 },
  ruleCard: { marginTop: 4, padding: 6, border: "1 solid #ddd", borderRadius: 3 },
  red: { color: "#b91c1c" },
  yellow: { color: "#a16207" },
  green: { color: "#15803d" },
  footer: {
    position: "absolute",
    left: 36,
    right: 36,
    bottom: 24,
    fontSize: 8,
    color: "#666",
  },
});

export interface QcRecordData {
  orgName: string;
  orgLogoUrl?: string | null;
  generatedAt: Date;
  job: {
    clientName: string;
    address: string;
    jobType: string;
    exposureClass: string;
  };
  mix: {
    name: string;
    cementType: string;
    designStrengthPsi: number;
    wcRatio: number;
  };
  weather: {
    tempF: number;
    humidityPct: number;
    windMph: number;
    evapRate?: number;
  } | null;
  events: Array<{ timestamp: string; event_type: string }>;
  tests: Array<{ test_type: string; value: number; unit: string; result_status?: string }>;
  rules: Array<{
    triggered: boolean;
    severity: "green" | "yellow" | "red";
    title: string;
    citation: string;
    message: string;
  }>;
  photoUrls: string[];
}

const severityStyle = (sev: "green" | "yellow" | "red") =>
  sev === "red" ? styles.red : sev === "yellow" ? styles.yellow : styles.green;

export function QcRecord({ data }: { data: QcRecordData }) {
  const triggered = data.rules.filter((r) => r.triggered);
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Concrete Pour Quality Record</Text>
            <Text>{data.orgName}</Text>
          </View>
          {data.orgLogoUrl ? <Image src={data.orgLogoUrl} style={styles.logo} /> : null}
        </View>

        <Section title="Job">
          <Row label="Client" value={data.job.clientName} />
          <Row label="Address" value={data.job.address} />
          <Row label="Type / Exposure" value={`${data.job.jobType} / ${data.job.exposureClass}`} />
        </Section>

        <Section title="Mix Design">
          <Row label="Name" value={data.mix.name} />
          <Row label="Cement" value={data.mix.cementType} />
          <Row label="Strength" value={`${data.mix.designStrengthPsi} psi`} />
          <Row label="W/C Ratio" value={String(data.mix.wcRatio)} />
        </Section>

        {data.weather && (
          <Section title="Weather at Placement">
            <Row label="Ambient" value={`${data.weather.tempF.toFixed(1)} °F`} />
            <Row label="Humidity" value={`${data.weather.humidityPct.toFixed(0)} %`} />
            <Row label="Wind" value={`${data.weather.windMph.toFixed(0)} mph`} />
            {data.weather.evapRate != null && (
              <Row label="Evap rate" value={`${data.weather.evapRate.toFixed(2)} lb/ft²/hr`} />
            )}
          </Section>
        )}

        <Section title="Events">
          {data.events.length === 0 ? (
            <Text>(no events logged)</Text>
          ) : (
            data.events.map((e, i) => (
              <Row
                key={i}
                label={new Date(e.timestamp).toLocaleString()}
                value={e.event_type.replace(/_/g, " ")}
              />
            ))
          )}
        </Section>

        <Section title="Quality Tests">
          {data.tests.length === 0 ? (
            <Text>(no tests logged)</Text>
          ) : (
            data.tests.map((t, i) => (
              <Row
                key={i}
                label={t.test_type.replace(/_/g, " ")}
                value={`${t.value} ${t.unit}${t.result_status ? ` (${t.result_status})` : ""}`}
              />
            ))
          )}
        </Section>

        <Section title="Rule Evaluations">
          {triggered.length === 0 ? (
            <Text style={styles.green}>All rules green.</Text>
          ) : (
            triggered.map((r, i) => (
              <View key={i} style={styles.ruleCard}>
                <Text style={severityStyle(r.severity)}>
                  {r.severity.toUpperCase()} — {r.title}
                </Text>
                <Text>{r.message}</Text>
                <Text style={{ color: "#666", marginTop: 2 }}>{r.citation}</Text>
              </View>
            ))
          )}
        </Section>

        {data.photoUrls.length > 0 && (
          <Section title="Photos">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {data.photoUrls.slice(0, 6).map((url, i) => (
                <Image key={i} src={url} style={{ width: 100, height: 80, objectFit: "cover" }} />
              ))}
            </View>
          </Section>
        )}

        <Text style={styles.footer}>
          Generated by PourGuard on {data.generatedAt.toLocaleString()}. Records retained for 7 years.
          {"\n"}
          {LEGAL_DISCLAIMER}
        </Text>
      </Page>
    </Document>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}
