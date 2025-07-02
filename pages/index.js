import Head from "next/head";
import dynamic from "next/dynamic";

const NeonGame = dynamic(() => import("../components/NeonGame"), { ssr: false });

export default function Home() {
  return (
    <>
      <Head>
        <title>Neon Neighbor</title>
        <meta name="description" content="A neon stealth game for all devices!" />
      </Head>
      <main style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0ff 0%, #09f 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <h1 style={{
          color: "#fff",
          textShadow: "0 0 10px #0ff, 0 0 40px #09f",
          fontWeight: "bold",
          fontSize: "3rem",
          marginBottom: "1rem"
        }}>
          Neon Neighbor
        </h1>
        <NeonGame />
        <p style={{ color: "#fff", marginTop: "1rem", textShadow: "0 0 8px #0ff" }}>
          Move: WASD / Arrows / Touch / Controller | Avoid the neon neighbor!
        </p>
      </main>
    </>
  );
}
