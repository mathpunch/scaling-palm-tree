import { useEffect, useRef } from "react";
import * as BABYLON from "babylonjs";
import "babylonjs-loaders";

const GAME_SIZE = 20;
const PLAYER_SPEED = 0.22;
const NEIGHBOR_SPEED = 0.14;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export default function NeonGame() {
  const canvasRef = useRef(null);
  const resizeRef = useRef();

  useEffect(() => {
    // Create engine and scene
    const canvas = canvasRef.current;
    const engine = new BABYLON.Engine(canvas, true, { stencil: true });
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.07, 0.05, 0.15, 1.0);

    // Camera
    const camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 2, Math.PI / 2.3, 16, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 13;
    camera.upperRadiusLimit = 22;
    camera.wheelPrecision = 80;
    camera.panningSensibility = 0;

    // Lighting
    const light = new BABYLON.PointLight("pl", new BABYLON.Vector3(0, 16, 0), scene);
    light.intensity = 0.9;
    light.diffuse = new BABYLON.Color3(0, 1, 1);
    light.specular = new BABYLON.Color3(0.5, 1, 1);

    // Floor
    const floor = BABYLON.MeshBuilder.CreateGround("ground", {width: GAME_SIZE, height: GAME_SIZE}, scene);
    const floorMat = new BABYLON.StandardMaterial("floorMat", scene);
    floorMat.diffuseColor = new BABYLON.Color3(0.04, 0.07, 0.13);
    floorMat.emissiveColor = new BABYLON.Color3(0, 1, 1).scale(0.15);
    floor.material = floorMat;

    // Neon Player
    const player = BABYLON.MeshBuilder.CreateBox("player", {size: 1}, scene);
    player.position = new BABYLON.Vector3(0, 0.5, 6);
    const playerMat = new BABYLON.StandardMaterial("playerMat", scene);
    playerMat.diffuseColor = new BABYLON.Color3(1, 0, 1);
    playerMat.emissiveColor = new BABYLON.Color3(1, 0, 1).scale(1.4);
    playerMat.specularPower = 128;
    player.material = playerMat;
    player.isPickable = false;

    // Neon Neighbor (AI)
    const neighbor = BABYLON.MeshBuilder.CreateBox("neighbor", {size: 1}, scene);
    neighbor.position = new BABYLON.Vector3(0, 0.5, -6);
    const neighborMat = new BABYLON.StandardMaterial("neighborMat", scene);
    neighborMat.diffuseColor = new BABYLON.Color3(0, 1, 1);
    neighborMat.emissiveColor = new BABYLON.Color3(0, 1, 1).scale(1.4);
    neighborMat.specularPower = 128;
    neighbor.material = neighborMat;
    neighbor.isPickable = false;

    // Borders
    const wallMat = new BABYLON.StandardMaterial("wallMat", scene);
    wallMat.diffuseColor = new BABYLON.Color3(0, 0.2, 0.5);
    wallMat.emissiveColor = new BABYLON.Color3(0, 0.7, 1).scale(0.5);
    const walls = [
      BABYLON.MeshBuilder.CreateBox("w1", {width: GAME_SIZE, height: 1, depth: 0.5}, scene),
      BABYLON.MeshBuilder.CreateBox("w2", {width: GAME_SIZE, height: 1, depth: 0.5}, scene),
      BABYLON.MeshBuilder.CreateBox("w3", {width: 0.5, height: 1, depth: GAME_SIZE}, scene),
      BABYLON.MeshBuilder.CreateBox("w4", {width: 0.5, height: 1, depth: GAME_SIZE}, scene),
    ];
    walls[0].position.set(0, 0.25, GAME_SIZE/2);
    walls[1].position.set(0, 0.25, -GAME_SIZE/2);
    walls[2].position.set(GAME_SIZE/2, 0.25, 0);
    walls[3].position.set(-GAME_SIZE/2, 0.25, 0);
    walls.forEach(w => w.material = wallMat);

    // Touch controls overlay (mobile)
    let isMobile = typeof window !== "undefined" && /Mobi|Android/i.test(navigator.userAgent);
    let joyDir = {x: 0, z: 0};
    let lastTouch = null;
    if (isMobile) {
      const overlay = document.createElement("div");
      overlay.style.position = "absolute";
      overlay.style.left = "0";
      overlay.style.top = "0";
      overlay.style.width = "100vw";
      overlay.style.height = "100vh";
      overlay.style.zIndex = 1000;
      overlay.style.touchAction = "none";
      overlay.style.background = "transparent";
      overlay.ontouchstart = e => {
        let t = e.touches[0];
        lastTouch = {x: t.clientX, y: t.clientY};
      };
      overlay.ontouchmove = e => {
        let t = e.touches[0];
        let dx = t.clientX - lastTouch.x;
        let dy = t.clientY - lastTouch.y;
        // Normalize
        let len = Math.sqrt(dx*dx + dy*dy) || 1;
        joyDir.x = clamp(dx/len, -1, 1);
        joyDir.z = clamp(dy/len, -1, 1);
      };
      overlay.ontouchend = e => {
        joyDir.x = 0; joyDir.z = 0;
        lastTouch = null;
      };
      document.body.appendChild(overlay);
      resizeRef.current = overlay;
    }

    // Input state
    let move = {x: 0, z: 0};

    // Keyboard
    const handleKey = (down, e) => {
      if (["w", "ArrowUp"].includes(e.key)) move.z = down ? -1 : (move.z === -1 ? 0 : move.z);
      if (["s", "ArrowDown"].includes(e.key)) move.z = down ? 1 : (move.z === 1 ? 0 : move.z);
      if (["a", "ArrowLeft"].includes(e.key)) move.x = down ? -1 : (move.x === -1 ? 0 : move.x);
      if (["d", "ArrowRight"].includes(e.key)) move.x = down ? 1 : (move.x === 1 ? 0 : move.x);
    };
    window.addEventListener("keydown", e => handleKey(true, e));
    window.addEventListener("keyup", e => handleKey(false, e));

    // Gamepad
    let gamepadIndex = null;
    window.addEventListener("gamepadconnected", (e) => {
      gamepadIndex = e.gamepad.index;
    });
    window.addEventListener("gamepaddisconnected", (e) => {
      if (gamepadIndex === e.gamepad.index) gamepadIndex = null;
    });

    let gameOver = false;

    // Main game loop
    scene.onBeforeRenderObservable.add(() => {
      // Gamepad input
      if (gamepadIndex !== null) {
        const gp = navigator.getGamepads()[gamepadIndex];
        if (gp) {
          move.x = Math.abs(gp.axes[0]) > 0.12 ? gp.axes[0] : 0;
          move.z = Math.abs(gp.axes[1]) > 0.12 ? gp.axes[1] : 0;
        }
      }

      // Touch input (mobile)
      if (isMobile && (joyDir.x !== 0 || joyDir.z !== 0)) {
        move.x = joyDir.x;
        move.z = joyDir.z;
      }

      // Player movement (normalized)
      let dx = clamp(move.x, -1, 1) * PLAYER_SPEED;
      let dz = clamp(move.z, -1, 1) * PLAYER_SPEED;
      let px = clamp(player.position.x + dx, -GAME_SIZE/2+0.7, GAME_SIZE/2-0.7);
      let pz = clamp(player.position.z + dz, -GAME_SIZE/2+0.7, GAME_SIZE/2-0.7);
      player.position.x = px;
      player.position.z = pz;

      // AI neighbor movement: chase player
      if (!gameOver) {
        let diff = player.position.subtract(neighbor.position);
        let dist = diff.length();
        if (dist > 0.01) {
          let step = diff.normalize().scale(Math.min(NEIGHBOR_SPEED, dist));
          neighbor.position.addInPlace(step);
        }
        // Collision
        if (player.position.subtract(neighbor.position).length() < 1.25) {
          gameOver = true;
        }
      }
    });

    // Render loop
    engine.runRenderLoop(() => {
      scene.render();
      if (gameOver) {
        // Draw overlay
        const ctx = engine.getRenderingCanvas().getContext("2d");
        ctx.save();
        ctx.font = "bold 48px Arial";
        ctx.textAlign = "center";
        ctx.shadowColor = "#0ff";
        ctx.shadowBlur = 24;
        ctx.fillStyle = "#fff";
        ctx.fillText("Game Over!", canvas.width/2, canvas.height/2);
        ctx.restore();
      }
    });

    // Responsive resize
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener("resize", handleResize);

    // Initial size
    engine.resize();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", e => handleKey(true, e));
      window.removeEventListener("keyup", e => handleKey(false, e));
      if (resizeRef.current) document.body.removeChild(resizeRef.current);
      scene.dispose();
      engine.dispose();
    };
  }, []);

  return (
    <div style={{
      width: "min(90vw, 600px)",
      height: "min(90vw, 600px)",
      maxWidth: 600,
      maxHeight: 600,
      border: "4px solid #0ff",
      borderRadius: "16px",
      boxShadow: "0 0 32px #0ff8, 0 0 8px #f0f6",
      background: "#03001c",
      margin: "auto",
      position: "relative"
    }}>
      <canvas ref={canvasRef} style={{
        width: "100%",
        height: "100%",
        display: "block",
        borderRadius: "16px",
        background: "#03001c"
      }} />
    </div>
  );
}
