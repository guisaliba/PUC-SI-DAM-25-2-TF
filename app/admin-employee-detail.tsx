import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import {
  computeMonthlySummary,
  formatDurationHMS,
  type MonthlySummary,
} from "../lib/timeSummary";
import { labelForType, type PunchType } from "../lib/utils";

type TimeEntry = {
  id: number;
  type: PunchType;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
};

export default function AdminEmployeeDetailScreen() {
  const { userId, name } = useLocalSearchParams<{
    userId: string;
    name?: string;
  }>();

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const loadEntries = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("time_entries")
        .select("id, type, timestamp, latitude, longitude")
        .eq("user_id", userId)
        .order("timestamp", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error loading time entries:", error);
        Alert.alert(
          "Erro",
          "Não foi possível obter os registros de ponto deste colaborador."
        );
        setLoading(false);
        return;
      }

      setEntries((data ?? []) as TimeEntry[]);

      const rawEntries =
        (data ?? []).map((row: any) => ({
          type: row.type as PunchType,
          timestamp: row.timestamp as string,
        })) ?? [];

      const s = computeMonthlySummary(rawEntries);
      setSummary(s);

      setLoading(false);
    };

    loadEntries();
  }, [userId]);

  const renderItem = ({ item }: { item: TimeEntry }) => {
    const entryDate = new Date(item.timestamp);
    const day = entryDate.toLocaleDateString("pt-BR");
    const time = entryDate.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const location =
      item.latitude != null && item.longitude != null
        ? `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`
        : "Sem localização";

    return (
      <View style={styles.entryRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.entryType}>{labelForType(item.type)}</Text>
          <Text style={styles.entryDate}>
            {day} às {time}
          </Text>
        </View>
        <Text style={styles.entryLocation}>{location}</Text>
      </View>
    );
  };

  const title = name ?? "Colaborador";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        Registros de ponto recentes deste colaborador.
      </Text>

      {summary && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Saldo do mês atual</Text>
          <Text style={styles.summaryText}>
            Total trabalhado: {formatDurationHMS(summary.totalMs)}
          </Text>
          <Text style={styles.summaryText}>
            Carga esperada (8h/dia, {summary.workDays} dia(s)):{" "}
            {formatDurationHMS(summary.expectedMs)}
          </Text>
          <Text
            style={[
              styles.summaryText,
              summary.saldoMs >= 0 ? styles.positive : styles.negative,
            ]}
          >
            Saldo: {formatDurationHMS(summary.saldoMs)}
          </Text>
          <Text style={styles.summaryHint}>
            Sua empresa definiu que sua escala de trabalho é de 48h semanais
            (8h/dia).
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Carregando registros...</Text>
        </View>
      ) : entries.length === 0 ? (
        <Text style={styles.emptyText}>
          Nenhum registro de ponto encontrado.
        </Text>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ marginTop: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#f9fafb",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: "#4b5563",
    marginTop: 4,
  },
  center: {
    marginTop: 32,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#4b5563",
  },
  emptyText: {
    marginTop: 24,
    fontSize: 14,
    color: "#6b7280",
  },
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 10,
    gap: 12,
  },
  entryType: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  entryDate: {
    fontSize: 13,
    color: "#6b7280",
  },
  entryLocation: {
    fontSize: 11,
    color: "#6b7280",
    textAlign: "right",
  },
  summaryCard: {
    marginTop: 16,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    color: "#4b5563",
  },
  summaryHint: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b7280",
  },
  positive: { color: "#16a34a" },
  negative: { color: "#dc2626" },
});
