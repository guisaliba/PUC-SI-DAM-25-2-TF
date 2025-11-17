import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function AdminHomeScreen() {
  const handleGoToRegisterEmployee = () => {
    router.push("/register-employee");
  };

  const handleGoToEmployees = () => {
    router.push("/admin-employees");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Área do gestor</Text>
        <Text style={styles.subtitle}>
          Cadastre novos colaboradores e acompanhe os registros de ponto da sua
          equipe.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cadastro de colaboradores</Text>
        <Text style={styles.cardSubtitle}>
          Use esta opção para cadastrar um novo colaborador na empresa.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={handleGoToRegisterEmployee}
        >
          <Text style={styles.primaryButtonText}>Cadastrar colaborador</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Visão da equipe</Text>
        <Text style={styles.cardSubtitle}>
          Visualizar a lista de colaboradores e seus registros de ponto.
        </Text>

        <Pressable style={styles.secondaryButton} onPress={handleGoToEmployees}>
          <Text style={styles.secondaryButtonText}>Ver colaboradores</Text>
        </Pressable>
      </View>
      <Pressable
        style={styles.logoutButton}
        onPress={async () => {
          await supabase.auth.signOut();
          router.replace("/"); // index.tsx
        }}
      >
        <Text style={styles.logoutText}>Sair</Text>
      </Pressable>
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
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#4b5563",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  primaryButton: {
    marginTop: 8,
    backgroundColor: "#111827",
    borderRadius: 9999,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryButton: {
    marginTop: 8,
    borderRadius: 9999,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  secondaryButtonText: {
    color: "#4b5563",
    fontWeight: "500",
    fontSize: 14,
  },
  logoutButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  logoutText: {
    color: "#ef4444",
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
  },
});
