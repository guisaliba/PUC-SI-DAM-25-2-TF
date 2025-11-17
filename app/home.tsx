import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
import { supabase } from "../lib/supabase";
import { labelForType, type PunchType } from "../lib/utils";

type PunchRecord = {
  id: string;
  type: PunchType;
  time: Date;
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString(["pt-BR"], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString(["pt-BR"], {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getTodayRange = () => {
  const today = new Date();

  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    0,
    0,
    0,
    0
  );

  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59,
    999
  );

  return { startOfDay, endOfDay };
};

const validatePunchTransition = (
  last: PunchType | undefined,
  next: PunchType
): { ok: boolean; message?: string } => {
  if (!last) {
    if (next !== "in") {
      return {
        ok: false,
        message: "Você precisa registrar uma saída primeiro.",
      };
    }

    return {
      ok: true,
    };
  }

  switch (last) {
    case "in":
      if (next === "start-break" || next === "out") return { ok: true };
      return {
        ok: false,
        message: "Após a entrada, registre intervalo ou saída.",
      };

    case "start-break":
      if (next === "end-break") return { ok: true };
      return {
        ok: false,
        message:
          "Você já iniciou o intervalo. Registre o retorno do intervalo.",
      };

    case "end-break":
      if (next === "start-break" || next === "out") return { ok: true };
      return {
        ok: false,
        message:
          "Após o retorno do intervalo, registre novo intervalo ou saída.",
      };

    case "out":
      if (next === "in") return { ok: true };
      return {
        ok: false,
        message: "Após a saída, o próximo registro deve ser uma nova entrada.",
      };

    default:
      return { ok: true };
  }
};

export default function HomeScreen() {
  const [records, setRecords] = useState<PunchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  const fetchTodayEntries = useCallback(
    async ({
      userId: explicitUserId,
      silent = false,
    }: { userId?: string; silent?: boolean } = {}) => {
      const effectiveUserId = explicitUserId ?? userId;

      if (!effectiveUserId) {
        return;
      }

      if (!silent) {
        setLoading(true);
      }

      try {
        const { startOfDay, endOfDay } = getTodayRange();

        const { data, error } = await supabase
          .from("time_entries")
          .select("*")
          .eq("user_id", effectiveUserId)
          .gte("timestamp", startOfDay.toISOString())
          .lte("timestamp", endOfDay.toISOString())
          .order("timestamp", { ascending: false });

        if (error) {
          throw error;
        }

        const mapped: PunchRecord[] = (data ?? []).map((row: any) => ({
          id: String(row.id),
          type: row.type as PunchType,
          time: new Date(row.timestamp),
        }));

        setRecords(mapped);
      } catch (error) {
        console.error("Error fetching time entries:", error);
        Alert.alert(
          "Erro",
          "Não foi possível carregar seus registros de hoje."
        );
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [userId]
  );

  useEffect(() => {
    const loadUserAndEntries = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("No logged-in user:", userError);
        Alert.alert("Sessão expirada", "Faça login novamente.");
        return;
      }

      setUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, work_email")
        .eq("id", user.id)
        .single();

      if (!profileError && profile) {
        setUserName(
          profile.full_name ?? profile.work_email ?? user.email ?? "Colaborador"
        );
      } else {
        setUserName(user.email ?? "Colaborador");
      }

      await fetchTodayEntries({ userId: user.id });
    };

    loadUserAndEntries();
  }, [fetchTodayEntries]);

  const handlePunch = async (type: PunchType) => {
    if (!userId) {
      Alert.alert("Usuário não autenticado. Faça login novamente.");
      return;
    }

    const lastType = records[0]?.type;
    const { ok, message } = validatePunchTransition(lastType, type);
    if (!ok) {
      Alert.alert(
        "Sequência inválida",
        message ?? "Ordem de registros inválida."
      );
      return;
    }

    let localRecord: PunchRecord | null = null;

    try {
      setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permissão de localização negada",
          "Não foi possível acessar sua localização. Sem isso, não conseguimos validar o registro de ponto."
        );
        setLoading(false);
        return;
      }

      const now = new Date();
      localRecord = {
        id: now.getTime().toString(),
        type,
        time: now,
      };

      setRecords((prev) => [localRecord!, ...prev]);

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;

      const { data, error } = await supabase
        .from("time_entries")
        .insert([
          {
            user_id: userId,
            type,
            timestamp: now.toISOString(),
            latitude,
            longitude,
          },
        ])
        .select()
        .single();

      if (error || !data) {
        throw error ?? new Error("Erro ao registrar o ponto.");
      }

      setRecords((prev) => [
        {
          id: String(data.id),
          type: data.type as PunchType,
          time: new Date(data.timestamp),
        },
        ...prev.filter((r) => r.id !== localRecord!.id),
      ]);
    } catch (error) {
      console.error("Error inserting time entry with location:", error);
      if (localRecord) {
        const placeholderId = localRecord.id;
        setRecords((prev) =>
          prev.filter((record) => record.id !== placeholderId)
        );
      }
      Alert.alert(
        "Erro",
        "Não foi possível registrar o ponto. Tente novamente."
      );
      await fetchTodayEntries({ silent: true });
    } finally {
      setLoading(false);
    }
  };

  const renderRecord: ListRenderItem<PunchRecord> = ({ item }) => {
    return (
      <View style={styles.recordRow}>
        <Text style={styles.recordTime}>{formatTime(item.time)}</Text>
        <Text style={styles.recordType}>{labelForType(item.type)}</Text>
      </View>
    );
  };

  const today = new Date();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Olá, {userName}!</Text>
        <Text style={styles.greeting}>Hoje é {formatDate(today)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Registrar ponto</Text>
        <Text style={styles.cardSubtitle}>
          Toque em um botão para registrar o horário atual.
        </Text>

        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.punchButton, styles.entryButton]}
            onPress={() => handlePunch("in")}
          >
            <Text style={styles.punchButtonText}>Entrada</Text>
          </Pressable>
          <Pressable
            style={[styles.punchButton, styles.breakButton]}
            onPress={() => handlePunch("start-break")}
          >
            <Text style={styles.punchButtonText}>Intervalo</Text>
          </Pressable>
          <Pressable
            style={[styles.punchButton, styles.breakButton]}
            onPress={() => handlePunch("end-break")}
          >
            <Text style={styles.punchButtonText}>Retorno</Text>
          </Pressable>
          <Pressable
            style={[styles.punchButton, styles.exitButton]}
            onPress={() => handlePunch("out")}
          >
            <Text style={styles.punchButtonText}>Saída</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.history}>
        <Text style={styles.historyTitle}>Registros de hoje</Text>
        {loading ? (
          <Text style={styles.emptyText}>Carregando registros...</Text>
        ) : records.length === 0 ? (
          <Text style={styles.emptyText}>
            Nenhum ponto registrado ainda hoje.
          </Text>
        ) : (
          <FlatList
            data={records}
            keyExtractor={(item) => item.id}
            renderItem={renderRecord}
          />
        )}
      </View>

      <View style={styles.bottomNav}>
        <Pressable style={[styles.navItem, styles.navItemActive]}>
          <Text style={[styles.navItemText, styles.navItemTextActive]}>
            Ponto
          </Text>
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={() => router.replace("/employee-card")}
        >
          <Text style={styles.navItemText}>Carteirinha</Text>
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={() => router.replace("/hours-balance")}
        >
          <Text style={styles.navItemText}>Saldo</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#f9fafb",
    gap: 24,
  },
  header: {
    marginTop: 16,
    gap: 4,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
  },
  dateText: {
    fontSize: 14,
    color: "#6b7280",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2, // Android shadow
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#6b7280",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 8,
  },
  punchButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: "center",
  },
  entryButton: {
    backgroundColor: "#22c55e",
  },
  breakButton: {
    backgroundColor: "#f97316",
  },
  exitButton: {
    backgroundColor: "#ef4444",
  },
  punchButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  history: {
    flex: 1,
    gap: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  emptyText: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
  },
  recordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  recordTime: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  recordType: {
    fontSize: 14,
    color: "#4b5563",
  },
  bottomNav: {
    marginTop: "auto",
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  navItemActive: {
    borderTopWidth: 2,
    borderTopColor: "#111827",
  },
  navItemText: {
    fontSize: 13,
    color: "#6b7280",
  },
  navItemTextActive: {
    color: "#111827",
    fontWeight: "600",
  },
});
