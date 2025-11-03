import AsyncStorage from "@react-native-async-storage/async-storage";
import { differenceInMinutes, format, isSameDay, parseISO } from "date-fns";
import React, { useEffect, useMemo, useState } from "react";
import {
	Alert,
	FlatList,
	Pressable,
	SafeAreaView,
	StyleSheet,
	Text,
	View,
} from "react-native";

type EntryKind = "in" | "out";
type TimeEntry = {
	id: string;
	kind: EntryKind;
	occurredAt: string; // ISO string
};

// ====== CONFIG: static as of now, will evolve to custom,per company, multiple work schedules configuration ======
const HOURS_PER_DAY = 8;
// ==================================================

const STORAGE_KEY = "clockin.entries.v1";

function nowIso() {
	return new Date().toISOString();
}
function dayKey(d: Date) {
	return format(d, "yyyy-MM-dd");
}
function minutesBetweenISO(aISO: string, bISO: string) {
	return Math.max(0, differenceInMinutes(parseISO(bISO), parseISO(aISO)));
}

/** Pairs IN→OUT in order and sums worked minutes for the given day. */
function computeWorkedMinutesForDay(entries: TimeEntry[], day: Date) {
	const todays = entries
		.filter((e) => isSameDay(parseISO(e.occurredAt), day))
		.sort(
			(a, b) =>
				parseISO(a.occurredAt).getTime() - parseISO(b.occurredAt).getTime()
		);

	const ins: TimeEntry[] = [];
	let total = 0;

	for (const e of todays) {
		if (e.kind === "in") {
			ins.push(e);
		} else if (e.kind === "out") {
			const lastIn = ins.shift();
			if (lastIn) total += minutesBetweenISO(lastIn.occurredAt, e.occurredAt);
			// if there's an OUT without a matching IN, we ignore it
		}
	}
	// If you're still clocked IN (odd count), we consider work until now:
	if (ins.length > 0) {
		const openIn = ins[0];
		total += minutesBetweenISO(openIn.occurredAt, nowIso());
	}
	return total;
}

function toHhMm(mins: number) {
	const sign = mins < 0 ? "-" : "";
	const m = Math.abs(mins);
	const h = Math.floor(m / 60);
	const mm = (m % 60).toString().padStart(2, "0");
	return `${sign}${h}h${mm}m`;
}

export default function App() {
	const [entries, setEntries] = useState<TimeEntry[]>([]);
	const [loading, setLoading] = useState(true);

	// Load persisted entries on boot
	useEffect(() => {
		(async () => {
			try {
				const raw = await AsyncStorage.getItem(STORAGE_KEY);
				if (raw) setEntries(JSON.parse(raw));
			} catch (e) {
				console.warn("Failed to load entries", e);
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	// Persist whenever entries change
	useEffect(() => {
		AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(() => {});
	}, [entries]);

	const today = new Date();
	const todayKey = dayKey(today);

	// Are we currently clocked in? (true if last event for today is an IN)
	const status = useMemo(() => {
		const todays = entries
			.filter((e) => isSameDay(parseISO(e.occurredAt), today))
			.sort(
				(a, b) =>
					parseISO(a.occurredAt).getTime() - parseISO(b.occurredAt).getTime()
			);
		const last = todays[todays.length - 1];
		return last?.kind === "in" ? "IN" : "OUT";
	}, [entries]);

	const workedMinutes = useMemo(
		() => computeWorkedMinutesForDay(entries, today),
		[entries]
	);
	const dueMinutes = HOURS_PER_DAY * 60;
	const balanceMinutes = workedMinutes - dueMinutes;

	async function addEntry(kind: EntryKind) {
		// Safety: prevent double IN or double OUT in a row today
		if (status === "IN" && kind === "in") {
			Alert.alert("Already IN", "You are already clocked in. Clock OUT first.");
			return;
		}
		if (status === "OUT" && kind === "out") {
			Alert.alert(
				"Already OUT",
				"You are already clocked out. Clock IN first."
			);
			return;
		}

		const entry: TimeEntry = {
			id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
			kind,
			occurredAt: nowIso(),
		};
		setEntries((prev) => [...prev, entry]);
	}

	function clearToday() {
		Alert.alert("Clear today?", "This will delete today's entries only.", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: () => {
					setEntries((prev) =>
						prev.filter((e) => !isSameDay(parseISO(e.occurredAt), today))
					);
				},
			},
		]);
	}

	// Data for today's list
	const todaysSorted = useMemo(
		() =>
			entries
				.filter((e) => isSameDay(parseISO(e.occurredAt), today))
				.sort(
					(a, b) =>
						parseISO(a.occurredAt).getTime() - parseISO(b.occurredAt).getTime()
				),
		[entries]
	);

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.container}>
				<Text style={styles.title}>Clock-in MVP</Text>
				<Text style={styles.sub}>
					{format(today, "EEE, dd MMM yyyy")} — {todayKey}
				</Text>

				<View style={styles.card}>
					<Row
						label="Status"
						value={status === "IN" ? "Clocked IN" : "Clocked OUT"}
						valueStyle={status === "IN" ? styles.badgeIn : styles.badgeOut}
					/>
					<Row label="Worked today" value={toHhMm(workedMinutes)} />
					<Row
						label={`Target (${HOURS_PER_DAY}h)`}
						value={toHhMm(dueMinutes)}
					/>
					<Row
						label="Balance"
						value={toHhMm(balanceMinutes)}
						valueStyle={balanceMinutes >= 0 ? styles.green : styles.red}
					/>
				</View>

				<View style={styles.buttons}>
					<Btn
						label="Clock IN"
						onPress={() => addEntry("in")}
						disabled={status === "IN"}
					/>
					<Btn
						label="Clock OUT"
						onPress={() => addEntry("out")}
						disabled={status === "OUT"}
						kind="secondary"
					/>
				</View>

				<View style={{ height: 16 }} />

				<Text style={styles.section}>Today’s entries</Text>
				{loading ? (
					<Text>Loading…</Text>
				) : todaysSorted.length === 0 ? (
					<Text style={{ color: "#666" }}>No entries yet.</Text>
				) : (
					<FlatList
						data={todaysSorted}
						keyExtractor={(it) => it.id}
						renderItem={({ item }) => (
							<View style={styles.listItem}>
								<Text style={styles.listKind}>{item.kind.toUpperCase()}</Text>
								<Text style={styles.listTime}>
									{format(parseISO(item.occurredAt), "HH:mm:ss")}
								</Text>
								<Text style={styles.listIso}>{item.occurredAt}</Text>
							</View>
						)}
					/>
				)}

				<View style={{ height: 12 }} />

				<Pressable onPress={clearToday} style={styles.clearBtn}>
					<Text style={styles.clearTxt}>Clear today</Text>
				</Pressable>
			</View>
		</SafeAreaView>
	);
}

function Row({
	label,
	value,
	valueStyle,
}: {
	label: string;
	value: string;
	valueStyle?: any;
}) {
	return (
		<View style={styles.row}>
			<Text style={styles.rowLabel}>{label}</Text>
			<Text style={[styles.rowValue, valueStyle]}>{value}</Text>
		</View>
	);
}

function Btn({
	label,
	onPress,
	disabled,
	kind = "primary",
}: {
	label: string;
	onPress: () => void;
	disabled?: boolean;
	kind?: "primary" | "secondary";
}) {
	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			style={({ pressed }) => [
				styles.btn,
				kind === "secondary" && styles.btnSecondary,
				disabled && styles.btnDisabled,
				pressed && !disabled && styles.btnPressed,
			]}
		>
			<Text style={styles.btnTxt}>{label}</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: "#0b0f17" },
	container: { flex: 1, padding: 16, gap: 12 },
	title: { fontSize: 24, fontWeight: "700", color: "white" },
	sub: { color: "#9fb0c3" },
	card: {
		backgroundColor: "#121826",
		borderRadius: 12,
		padding: 14,
		gap: 8,
		borderWidth: 1,
		borderColor: "#1f2a44",
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	rowLabel: { color: "#9fb0c3" },
	rowValue: { color: "white", fontWeight: "600" },
	badgeIn: { color: "#22c55e" },
	badgeOut: { color: "#f97316" },
	green: { color: "#22c55e" },
	red: { color: "#ef4444" },
	buttons: { flexDirection: "row", gap: 12 },
	btn: {
		flex: 1,
		backgroundColor: "#2563eb",
		paddingVertical: 14,
		borderRadius: 10,
		alignItems: "center",
	},
	btnTxt: {
		color: "#ffffff",
		fontWeight: "700",
		letterSpacing: 0.3,
	},
	btnSecondary: { backgroundColor: "#475569" },
	btnDisabled: { opacity: 0.5 },
	btnPressed: { opacity: 0.8 },
	section: {
		color: "#9fb0c3",
		marginTop: 4,
		marginBottom: 2,
		fontWeight: "600",
	},
	listItem: {
		backgroundColor: "#0f1523",
		borderRadius: 10,
		padding: 12,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: "#1f2a44",
	},
	listKind: { color: "white", fontWeight: "700" },
	listTime: { color: "#9fb0c3" },
	listIso: { color: "#5a6b85", fontSize: 12, marginTop: 2 },
	clearBtn: { alignSelf: "center", padding: 10 },
	clearTxt: { color: "#94a3b8", textDecorationLine: "underline" },
});
