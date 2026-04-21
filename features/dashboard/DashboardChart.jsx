"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatIDR } from "@/lib/shared/format";

export default function DashboardChart({ data }) {
  return (
    <div className="h-[250px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border, #f0f0f0)" />
          <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
          <Tooltip
            contentStyle={{
              background: "var(--card-bg, #fff)",
              border: "1px solid var(--card-border, #e5e7eb)",
              borderRadius: "10px",
              fontSize: "13px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              color: "var(--foreground)",
            }}
            formatter={(value) => formatIDR(value)}
          />
          <Bar dataKey="kas" name="Kas" fill="var(--color-brand)" radius={[5, 5, 0, 0]} />
          <Bar dataKey="pengeluaran" name="Pengeluaran" fill="var(--color-danger)" radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
