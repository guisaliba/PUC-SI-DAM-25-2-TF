import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function RegisterEmployeeScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("12345678");
  const [loading, setLoading] = useState(false);

  const handleRegisterEmployee = async () => {
    if (!email) {
      Alert.alert("O email do colaborador é obrigatório.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.functions.invoke(
      "register-employee",
      {
        body: {
          email,
          full_name: fullName,
          password: tempPassword,
        },
      }
    );

    setLoading(false);

    if (error) {
      console.error("Error calling register-employee Edge function:", error);
      Alert.alert(
        "Erro",
        error.message ?? "Não foi possível cadastrar o colaborador."
      );
      return;
    }

    Alert.alert(
      "Sucesso",
      `Colaborador cadastrado com sucesso: \n${data?.email ?? email}`
    );

    setFullName("");
    setEmail("");
    setTempPassword("12345678");

    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cadastrar colaborador</Text>
      <Text style={styles.subtitle}>
        Preencha os dados abaixo para cadastrar um novo colaborador.
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>Nome completo do colaborador</Text>
        <TextInput
          style={styles.input}
          placeholder="Nome completo"
          value={fullName}
          onChangeText={setFullName}
        />

        <Text style={styles.label}>Email do colaborador</Text>
        <TextInput
          style={styles.input}
          placeholder="funcionario@empresa.com"
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Senha temporária</Text>
        <TextInput
          style={styles.input}
          placeholder="Senha temporária"
          onChangeText={setTempPassword}
          secureTextEntry
        />

        {/* Later: select empresa, cargo, jornada, etc. */}

        <Pressable
          style={styles.button}
          onPress={handleRegisterEmployee}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Cadastrando..." : "Cadastrar colaborador"}
          </Text>
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
    gap: 16,
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
  },
  form: {
    marginTop: 16,
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  button: {
    marginTop: 16,
    backgroundColor: "#111827",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
});
