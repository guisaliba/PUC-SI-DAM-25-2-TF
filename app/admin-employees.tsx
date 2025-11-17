import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

type Employee = {
  id: string;
  full_name: string | null;
  work_email: string | null;
  role: string | null;
};

export default function AdminEmployeesScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadEmployees = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, work_email, role")
        .eq("role", "employee")
        .order("full_name", { ascending: true });

      if (error) {
        console.error("Error loading employees:", error);
        Alert.alert("Erro", "Não foi possível obter a lista de colaboradores.");
        setLoading(false);
        return;
      }

      setEmployees((data ?? []) as Employee[]);
      setLoading(false);
    };

    loadEmployees();
  }, []);

  const handleOpenEmployee = (employee: Employee) => {
    router.push({
      pathname: "/admin-employee-detail",
      params: {
        userId: employee.id,
        name: employee.full_name ?? employee.work_email ?? "Colaborador",
      },
    });
  };

  const renderItem = ({ item }: { item: Employee }) => (
    <Pressable style={styles.row} onPress={() => handleOpenEmployee(item)}>
      <View>
        <Text style={styles.name}>
          {item.full_name ?? "Colaborador sem nome cadastrado"}
        </Text>
        {item.work_email && <Text style={styles.email}>{item.work_email}</Text>}
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Colaboradores</Text>
      <Text style={styles.subtitle}>
        Selecione um colaborador para ver os registros de ponto.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      ) : employees.length === 0 ? (
        <Text style={styles.emptyText}>
          Nenhum colaborador cadastrado até o momento.
        </Text>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
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
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  name: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  email: {
    fontSize: 13,
    color: "#6b7280",
  },
});
