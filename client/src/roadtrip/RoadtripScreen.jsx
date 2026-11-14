// Road Trip — จอช่วงเดินทาง 3D (phase intro / drive / fork / event): ฉากขับ RoadDrive + แผงซ้อน (ทางแยก · เหตุการณ์ · วิทยุ)
//  ช่วงนี้ไม่มีการ์ด/สกิล/ปุ่มตัวละครเลย (ผู้ใช้สั่ง 2026-11-14) — Game.jsx เรียกจอนี้แทนกระดานทั้งหมด
//  จุดพัก/ต่อสู้ = กระดาน 2D เดิมใน Game.jsx (+ StopBar / VanStatus / Garage) · จบ = RoadtripSummary
import { useEffect, useState } from "react";
import RoadDrive from "./RoadDrive";
import ForkPanel from "./ForkPanel";
import EventCard from "./EventCard";
import RadioPanel from "./RadioPanel";
import "./roadtrip.css";

export const RT_DRIVE_PHASES = new Set(["intro", "drive", "fork", "event"]);

function useHudZoom() {
  const calc = () => (typeof window === "undefined" ? 1 : Math.min(1.6, Math.max(0.6, Math.min(window.innerHeight / 810, window.innerWidth / 1376))));
  const [z, setZ] = useState(calc);
  useEffect(() => {
    const on = () => setZ(calc());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return z;
}

export default function RoadtripScreen({ state, lowQ, driveNode, active = true }) {
  const rt = state.roadtrip || {};
  const zoom = useHudZoom();
  const players = state.players || [];
  if (!active) return <div className="rt-travel" style={{ display: "none" }} aria-hidden="true">{driveNode !== undefined ? null : <RoadDrive state={state} lowQ={lowQ} active={false} />}</div>;
  return (
    <div className="rt-travel">
      {driveNode !== undefined ? driveNode : <RoadDrive state={state} lowQ={lowQ} active />}
      {rt.phase === "fork" && rt.fork && <ForkPanel fork={rt.fork} endsAt={rt.endsAt} players={players} youId={state.youId} />}
      {rt.phase === "event" && rt.event && <EventCard key={rt.event.id} event={rt.event} endsAt={rt.endsAt} players={players} youId={state.youId} />}
      {rt.phase !== "intro" && <RadioPanel radioState={rt.radio} zoom={zoom} />}
    </div>
  );
}
