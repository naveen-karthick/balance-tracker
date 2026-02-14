import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gopika, will you be my Valentine?",
  description: "A special Valentine's question for Gopika",
};

export default function ValentineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
