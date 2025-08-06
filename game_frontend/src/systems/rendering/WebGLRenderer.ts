import * as THREE from 'three';
import { IRenderer } from './IRenderer';
import { Entity } from '../../ecs/Entity';
import {
  PositionComponent,
  RenderableComponent,
  AIComponent,
  HealthComponent,
  BuffComponent,
  TalentComponent,
} from '../../ecs/Component';
import { NoteComponent } from '../../ecs/components/NoteComponent'; // Import NoteComponent
import { ECSManager } from '../../ecs/ECSManager';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { config } from '../../config';

// --- Importación de Shaders ---
import fireVertexShader from '../../shaders/fire.vert?raw';
import fireFragmentShader from '../../shaders/fire.frag?raw';
import iceVertexShader from '../../shaders/ice.vert?raw';
import iceFragmentShader from '../../shaders/ice.frag?raw';
import shadowVertexShader from '../../shaders/shadow.vert?raw';
import shadowFragmentShader from '../../shaders/shadow.frag?raw';
import beamVertexShader from '../../shaders/beam.vert?raw';
import beamFragmentShader from '../../shaders/beam.frag?raw';
import conductorVertexShader from '../../shaders/conductor.vert?raw';
import conductorFragmentShader from '../../shaders/conductor.frag?raw';
import virtuosoVertexShader from '../../shaders/virtuoso.vert?raw';
import virtuosoFragmentShader from '../../shaders/virtuoso.frag?raw';

// Background Shaders
const backgroundVertexShader = `
    void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const backgroundFragmentShader = `
    uniform float u_time;
    uniform float u_intensity;
    uniform bool u_beat;
    uniform vec3 u_baseColor;

    void main() {
        vec3 color = u_baseColor;
        color.r += sin(u_time * 0.1) * 0.1;
        color.g += cos(u_time * 0.08) * 0.1;
        color.b += sin(u_time * 0.15) * 0.1;
        color *= (0.8 + u_intensity * 0.4);
        if (u_beat) {
            color += vec3(0.2);
        }
        gl_FragColor = vec4(color, 1.0);
    }
`;

let playerAura: THREE.Mesh | null = null;
let defaultAuraMaterial: THREE.MeshStandardMaterial;
let fireMaterial: THREE.ShaderMaterial;
let iceMaterial: THREE.ShaderMaterial;
let shadowMaterial: THREE.ShaderMaterial;
let conductorMaterial: THREE.ShaderMaterial;
let virtuosoMaterial: THREE.ShaderMaterial;
export let beamMaterial: THREE.ShaderMaterial;

type RenderContext = 'menu' | 'playing';

/**
 * A WebGL renderer that uses Three.js.
 */
export class WebGLRenderer implements IRenderer {
  private scene: THREE.Scene;
  private menuScene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private ecs: ECSManager | null = null;
  private context: RenderContext = 'menu';
  private entityMap: Map<Entity, THREE.Object3D> = new Map();
  private noteInstanceMap: Map<Entity, number> = new Map();
  private noteInstancedMesh: THREE.InstancedMesh;
  private noteDummy: THREE.Object3D = new THREE.Object3D();

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.scene = new THREE.Scene();
    this.menuScene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = config.WEBGL_RENDERER.PLAYER_RADIUS;

    const renderPass = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), config.WEBGL_RENDERER.AURA_RADIUS, config.WEBGL_RENDERER.AURA_OPACITY, config.WEBGL_RENDERER.AURA_TURBULENCE);
    bloomPass.threshold = 0;
    bloomPass.strength = config.WEBGL_RENDERER.AURA_RADIUS;
    bloomPass.radius = 0;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    this.composer.addPass(bloomPass);

    this.setupBackground();
    this.setupScenes();
    this.createShaderMaterials();

    // Initialize InstancedMesh for notes
    const noteGeometry = new THREE.PlaneGeometry(50, 50);
    const noteMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); // White material, color will be set per instance
    this.noteInstancedMesh = new THREE.InstancedMesh(noteGeometry, noteMaterial, 1000); // Max 1000 notes
    this.noteInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.noteInstancedMesh);
  }

  /**
   * Sets the ECS manager.
   * @param ecs The ECS manager.
   */
  public setECS(ecs: ECSManager) {
    this.ecs = ecs;
  }

  /**
   * Sets the render context.
   * @param context The render context.
   */
  public setContext(context: RenderContext) {
    this.context = context;
    if (context === 'menu') {
      this.composer.passes[0] = new RenderPass(this.menuScene, this.camera);
    } else {
      this.composer.passes[0] = new RenderPass(this.scene, this.camera);
    }
  }

  /**
   * Sets up the background.
   */
  private setupBackground() {
    const backgroundGeometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
    const backgroundMaterial = new THREE.ShaderMaterial({
      vertexShader: backgroundVertexShader,
      fragmentShader: backgroundFragmentShader,
      uniforms: {
        u_time: { value: 0.0 },
        u_intensity: { value: 0.5 },
        u_beat: { value: false },
        u_baseColor: { value: new THREE.Color('#000000') },
      },
    });
    const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    background.position.z = -10;
    this.scene.add(background);
  }

  /**
   * Sets up the scenes.
   */
  private setupScenes() {
    // Add a light to the menu scene
    const menuLight = new THREE.PointLight(0xffffff, 1, 100);
    menuLight.position.set(0, 0, 5);
    this.menuScene.add(menuLight);
  }

  /**
   * Creates the shader materials.
   */
  private createShaderMaterials() {
    defaultAuraMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.COLORS.CYAN),
      transparent: true,
      opacity: 0.3,
      emissive: new THREE.Color(config.COLORS.CYAN),
      emissiveIntensity: 0.5,
    });
    fireMaterial = new THREE.ShaderMaterial({
      uniforms: { u_time: { value: 0.0 } },
      vertexShader: fireVertexShader,
      fragmentShader: fireFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    iceMaterial = new THREE.ShaderMaterial({
      uniforms: { u_time: { value: 0.0 } },
      vertexShader: iceVertexShader,
      fragmentShader: iceFragmentShader,
      transparent: true,
    });
    shadowMaterial = new THREE.ShaderMaterial({
      uniforms: { u_time: { value: 0.0 } },
      vertexShader: shadowVertexShader,
      fragmentShader: shadowFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    conductorMaterial = new THREE.ShaderMaterial({
        uniforms: { 
            u_time: { value: 0.0 },
            u_color: { value: new THREE.Color(config.COLORS.BLUE_VIOLET) } 
        },
        vertexShader: conductorVertexShader,
        fragmentShader: conductorFragmentShader,
    });
    virtuosoMaterial = new THREE.ShaderMaterial({
        uniforms: { 
            u_time: { value: 0.0 },
            u_color: { value: new THREE.Color(config.COLORS.PLUM) } 
        },
        vertexShader: virtuosoVertexShader,
        fragmentShader: virtuosoFragmentShader,
    });
    beamMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0.0 },
        u_color: { value: new THREE.Color(config.COLORS.CYAN) },
      },
      vertexShader: beamVertexShader,
      fragmentShader: beamFragmentShader,
      transparent: true,
      depthWrite: false,
    });
  }
  
    /**
     * Draws an entity.
     * @param entity The entity to draw.
     * @param pos The position component.
     * @param renderable The renderable component.
     * @param isPlayer Whether the entity is the player.
     * @param isEnemy Whether the entity is an enemy.
     * @param isProjectile Whether the entity is a projectile.
     * @param health The health component.
     * @param buff The buff component.
     * @param talents The talent component.
     * @param note The note component.
     */
    public drawEntity(
    entity: Entity,
    pos: PositionComponent,
    renderable: RenderableComponent,
    isPlayer: boolean,
    isEnemy: boolean,
    isProjectile: boolean,
    health?: HealthComponent,
    buff?: BuffComponent,
    talents?: TalentComponent,
    note?: NoteComponent
  ): void {
    if (this.context !== 'playing') return;
    let object = this.entityMap.get(entity);
    if (!object) {
      object = this.createObjectForEntity(
        entity,
        renderable,
        isPlayer,
      );
      if (!object) return;
      this.scene.add(object);
      this.entityMap.set(entity, object);
    }

    object.position.set(pos.x, pos.y, 0);

    if (isPlayer && playerAura) {
      const time = this.renderer.info.render.frame * 0.01;
      const pulse = (Math.sin(time * 2.0) + 1.0) / 2.0;
      const baseColor = new THREE.Color(config.COLORS.CYAN);
      const pulseColor = new THREE.Color(config.COLORS.BLUE_VIOLET);
      (playerAura.material as THREE.MeshStandardMaterial).color.lerpColors(baseColor, pulseColor, pulse);
    }

    const aiComponent = this.ecs?.getComponent(entity, AIComponent);
    if (aiComponent && object instanceof THREE.Mesh) {
        if (aiComponent.aiType === 'conductor') {
            object.material = conductorMaterial;
            conductorMaterial.uniforms.u_color.value.set(renderable.color);
        } else if (aiComponent.aiType === 'virtuoso') {
            object.material = virtuosoMaterial;
            virtuosoMaterial.uniforms.u_color.value.set(renderable.color);
        } else if (object.material instanceof THREE.MeshStandardMaterial) {
            (object.material as THREE.MeshStandardMaterial).color.set(renderable.color);
        }
    }

    // Handle NoteComponent rendering
    // Handle NoteComponent rendering with InstancedMesh
    if (note) {
      let instanceId = this.noteInstanceMap.get(entity);
      if (instanceId === undefined) {
        instanceId = this.noteInstancedMesh.count;
        this.noteInstanceMap.set(entity, instanceId);
        this.noteInstancedMesh.count++;
      }

      this.noteDummy.position.set(pos.x, pos.y, 0);
      this.noteDummy.updateMatrix();
      this.noteInstancedMesh.setMatrixAt(instanceId, this.noteDummy.matrix);
      this.noteInstancedMesh.setColorAt(instanceId, new THREE.Color(note.color));
      this.noteInstancedMesh.instanceMatrix.needsUpdate = true;
      if (this.noteInstancedMesh.instanceColor) {
        this.noteInstancedMesh.instanceColor.needsUpdate = true;
      }
      return; // Note handled by instancing
    }
  }

  /**
   * Creates an object for an entity.
   * @param entity The entity.
   * @param renderable The renderable component.
   * @param isPlayer Whether the entity is the player.
   * @returns The created object, or null if it could not be created.
   */
  private createObjectForEntity(
    entity: Entity,
    renderable: RenderableComponent,
    isPlayer: boolean,
  ): THREE.Object3D | null {
    // If it's a note, we don't create a separate object, it's handled by InstancedMesh
    const noteComponent = this.ecs?.getComponent(entity, NoteComponent);
    if (noteComponent) {
        return null; // Notes are handled by InstancedMesh
    }

    let geometry: THREE.BufferGeometry;
    const material: THREE.Material;

    switch (renderable.shape) {
        case 'circle':
            geometry = new THREE.CircleGeometry(renderable.width / 2, 32);
            break;
        case 'rectangle':
            geometry = new THREE.PlaneGeometry(renderable.width, renderable.height);
            break;
        case 'diamond':
            geometry = new THREE.CylinderGeometry(renderable.width / 2, renderable.width / 2, renderable.height, 4, 1);
            break;
        case 'floordrop':
            geometry = new THREE.PlaneGeometry(50, 50);
            break;
        default:
            return null;
    }
    material = new THREE.MeshStandardMaterial({ color: renderable.color });

    const object = new THREE.Mesh(geometry, material);

    if (isPlayer) {
      const auraGeometry = new THREE.SphereGeometry(renderable.width, 32, 32);
      playerAura = new THREE.Mesh(auraGeometry, defaultAuraMaterial);
      object.add(playerAura);
    }

    return object;
  }

  /**
   * Renders the scene.
   * @param deltaTime The time since the last update.
   * @param time The current time.
   */
  public render(deltaTime: number, time: number): void {
    fireMaterial.uniforms.u_time.value = time;
    iceMaterial.uniforms.u_time.value = time;
    shadowMaterial.uniforms.u_time.value = time;
    beamMaterial.uniforms.u_time.value = time;
    conductorMaterial.uniforms.u_time.value = time;
    virtuosoMaterial.uniforms.u_time.value = time;

    this.composer.render(deltaTime);
  }

    /**
     * Cleans up the renderer.
     * @param activeEntities The active entities.
     */
    public cleanup(activeEntities: Set<Entity>): void {
        const entitiesToRemove = new Set<Entity>();
        for (const entityId of this.entityMap.keys()) {
            if (!activeEntities.has(entityId)) {
                entitiesToRemove.add(entityId);
            }
        }

        // Handle notes cleanup
        const noteEntitiesToRemove = new Set<Entity>();
        for (const entityId of this.noteInstanceMap.keys()) {
            if (!activeEntities.has(entityId)) {
                noteEntitiesToRemove.add(entityId);
            }
        }

        for (const entityId of noteEntitiesToRemove) {
            const instanceId = this.noteInstanceMap.get(entityId);
            if (instanceId !== undefined) {
                // Swap with the last active instance to maintain a dense array
                const lastInstanceId = this.noteInstancedMesh.count - 1;
                if (instanceId !== lastInstanceId) {
                    this.noteInstancedMesh.getMatrixAt(lastInstanceId, this.noteDummy.matrix);
                    this.noteInstancedMesh.setMatrixAt(instanceId, this.noteDummy.matrix);
                    if (this.noteInstancedMesh.instanceColor) {
                        const lastColor = new THREE.Color();
                        this.noteInstancedMesh.getColorAt(lastInstanceId, lastColor);
                        this.noteInstancedMesh.setColorAt(instanceId, lastColor);
                    }
                    // Update the entity that was at the last position to its new position
                    for (const [key, value] of this.noteInstanceMap.entries()) {
                        if (value === lastInstanceId) {
                            this.noteInstanceMap.set(key, instanceId);
                            break;
                        }
                    }
                }
                this.noteInstancedMesh.count--;
                this.noteInstanceMap.delete(entityId);
            }
        }
        if (this.noteInstancedMesh.instanceMatrix) {
            this.noteInstancedMesh.instanceMatrix.needsUpdate = true;
        }
        if (this.noteInstancedMesh.instanceColor) {
            this.noteInstancedMesh.instanceColor.needsUpdate = true;
        }

        // Handle other entities cleanup
        for (const entityId of entitiesToRemove) {
            const object = this.entityMap.get(entityId);
            if (object) {
                this.scene.remove(object);
                // Dispose of geometries and materials to free up memory
                if (object instanceof THREE.Mesh) {
                    object.geometry.dispose();
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
            this.entityMap.delete(entityId);
        }
    }

    /**
     * Gets the object for an entity.
     * @param entityId The entity ID.
     * @returns The object for the entity, or undefined if not found.
     */
    public getEntityObject(entityId: number): THREE.Object3D | undefined {
        return this.entityMap.get(entityId);
    }

    /**
     * Gets the scene.
     * @returns The scene.
     */
    public getScene(): THREE.Scene {
        return this.scene;
    }
}