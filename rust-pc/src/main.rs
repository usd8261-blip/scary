use bevy::{
    asset::{embedded_asset, embedded_path, io::AssetSourceId, AssetPath},
    audio::Volume, gilrs::GilrsPlugin, input::mouse::MouseMotion,
    pbr::{DirectionalLightShadowMap, FogFalloff, PointLightShadowMap},
    prelude::*,
};

const NIGHT_DURATION: f32 = 210.0;
const ROOM_MIN_X: f32 = -6.5;
const ROOM_MAX_X: f32 = 20.5;
const ROOM_MIN_Z: f32 = -10.5;
const ROOM_MAX_Z: f32 = 10.5;

const COLLIDERS: [RectCollider; 33] = [
    // Bedroom 1
    RectCollider { min_x: -6.16, max_x: -6.0, min_z: -4.0, max_z: 4.0 }, // b1w1
    RectCollider { min_x: -6.0, max_x: 6.0, min_z: -4.16, max_z: -4.0 }, // b1w2
    RectCollider { min_x: -6.0, max_x: 6.0, min_z: 4.0, max_z: 4.16 }, // b1w3
    RectCollider { min_x: 6.0, max_x: 6.16, min_z: -4.0, max_z: -0.75 }, // b1w4a
    RectCollider { min_x: 6.0, max_x: 6.16, min_z: 0.75, max_z: 4.0 }, // b1w4b
    // Corridor
    RectCollider { min_x: 6.0, max_x: 10.16, min_z: -10.24, max_z: -10.08 }, // cw1
    RectCollider { min_x: 6.0, max_x: 7.1, min_z: 10.08, max_z: 10.24 }, // cw2a
    RectCollider { min_x: 8.9, max_x: 10.16, min_z: 10.08, max_z: 10.24 }, // cw2b
    RectCollider { min_x: 10.0, max_x: 10.16, min_z: -10.08, max_z: -6.0 }, // cw3a
    RectCollider { min_x: 10.0, max_x: 10.16, min_z: -4.4, max_z: 4.4 }, // cw3b
    RectCollider { min_x: 10.0, max_x: 10.16, min_z: 6.0, max_z: 10.08 }, // cw3c
    RectCollider { min_x: 6.0, max_x: 6.16, min_z: -10.16, max_z: -4.08 }, // cw4a
    RectCollider { min_x: 6.0, max_x: 6.16, min_z: 4.08, max_z: 10.16 }, // cw4b
    RectCollider { min_x: 6.17, max_x: 6.73, min_z: 6.17, max_z: 7.43 }, // closet
    // Kitchen
    RectCollider { min_x: 10.0, max_x: 20.16, min_z: -10.24, max_z: -10.08 }, // kw1
    RectCollider { min_x: 20.0, max_x: 20.16, min_z: -10.24, max_z: 0.16 }, // kw2
    RectCollider { min_x: 10.0, max_x: 20.16, min_z: 0.0, max_z: 0.16 }, // kw3
    RectCollider { min_x: 10.4, max_x: 15.8, min_z: -9.84, max_z: -9.12 }, // counter
    RectCollider { min_x: 19.0, max_x: 20.0, min_z: -7.65, max_z: -6.75 }, // fridge
    RectCollider { min_x: 13.1, max_x: 15.3, min_z: -4.6, max_z: -3.4 }, // kitchenTable
    RectCollider { min_x: 19.12, max_x: 19.98, min_z: -2.95, max_z: -1.45 }, // pantry
    // Workroom
    RectCollider { min_x: 10.0, max_x: 20.16, min_z: 10.08, max_z: 10.24 }, // ww1
    RectCollider { min_x: 20.0, max_x: 20.16, min_z: -0.16, max_z: 10.24 }, // ww2
    RectCollider { min_x: 17.4, max_x: 20.0, min_z: 4.5, max_z: 5.5 }, // desk2
    RectCollider { min_x: 19.15, max_x: 19.85, min_z: 9.03, max_z: 9.67 }, // safe
    RectCollider { min_x: 10.17, max_x: 10.72, min_z: 7.45, max_z: 8.95 }, // cabinet
    RectCollider { min_x: 12.05, max_x: 13.1, min_z: 2.15, max_z: 3.05 }, // armchair
    // Bedroom furniture
    RectCollider { min_x: -5.15, max_x: -2.05, min_z: -3.35, max_z: -1.25 }, // bed
    RectCollider { min_x: -2.15, max_x: -1.45, min_z: -3.55, max_z: -2.85 }, // nightstand
    RectCollider { min_x: -1.45, max_x: 1.05, min_z: -3.65, max_z: -2.72 }, // desk
    RectCollider { min_x: 3.85, max_x: 5.45, min_z: -3.5, max_z: -2.0 }, // wardrobe
    RectCollider { min_x: 0.05, max_x: 2.15, min_z: 0.55, max_z: 1.85 }, // table
    RectCollider { min_x: -5.25, max_x: -4.15, min_z: 2.15, max_z: 3.25 }, // boxes
];

const HIDE_SPOTS: [HideSpot; 6] = [
    HideSpot {
        name: "под кроватью",
        position: Vec3::new(-3.55, 0.34, -2.15),
        exit: Vec3::new(-3.55, 0.0, -0.82),
        yaw: std::f32::consts::PI,
    },
    HideSpot {
        name: "в шкафу",
        position: Vec3::new(4.65, 1.42, -2.65),
        exit: Vec3::new(4.65, 0.0, -1.55),
        yaw: std::f32::consts::PI,
    },
    HideSpot {
        name: "в шкафу коридора",
        position: Vec3::new(6.75, 1.45, 6.8),
        exit: Vec3::new(7.6, 0.0, 6.8),
        yaw: -std::f32::consts::FRAC_PI_2,
    },
    HideSpot {
        name: "под стойкой",
        position: Vec3::new(13.1, 0.7, -9.05),
        exit: Vec3::new(13.1, 0.0, -8.4),
        yaw: std::f32::consts::PI,
    },
    HideSpot {
        name: "в кладовке",
        position: Vec3::new(19.0, 1.4, -2.2),
        exit: Vec3::new(18.4, 0.0, -2.2),
        yaw: std::f32::consts::FRAC_PI_2,
    },
    HideSpot {
        name: "в шкафу кабинета",
        position: Vec3::new(10.78, 1.4, 8.2),
        exit: Vec3::new(11.7, 0.0, 8.2),
        yaw: -std::f32::consts::FRAC_PI_2,
    },
];

const PATROL_POINTS: [Vec3; 12] = [
    // bedroom
    Vec3::new(-3.0, 0.0, 2.6),
    Vec3::new(2.6, 0.0, 3.0),
    Vec3::new(3.0, 0.0, 0.2),
    // corridor
    Vec3::new(8.0, 0.0, 0.5),
    Vec3::new(8.0, 0.0, 8.2),
    Vec3::new(8.0, 0.0, -8.6),
    // kitchen
    Vec3::new(12.6, 0.0, -8.2),
    Vec3::new(15.2, 0.0, -5.6),
    Vec3::new(17.5, 0.0, -2.0),
    // workroom
    Vec3::new(12.6, 0.0, 8.6),
    Vec3::new(17.0, 0.0, 7.6),
    Vec3::new(17.6, 0.0, 2.4),
];

const TASK_SPOTS: [TaskSpot; 10] = [
    TaskSpot {
        name: "починить окно",
        hint: "подойди к окну",
        position: Vec3::new(1.75, 0.0, -2.85),
        look_at: Vec3::new(1.75, 2.05, -3.84),
        hold_seconds: 3.0,
        time_bonus: 12.0,
    },
    TaskSpot {
        name: "проверить розетку",
        hint: "подойди к столу",
        position: Vec3::new(1.1, 0.0, 2.3),
        look_at: Vec3::new(1.1, 0.95, 1.2),
        hold_seconds: 2.5,
        time_bonus: 10.0,
    },
    TaskSpot {
        name: "настроить радио",
        hint: "подойди к тумбочке у кровати",
        position: Vec3::new(-1.75, 0.0, -2.35),
        look_at: Vec3::new(-1.8, 0.85, -3.2),
        hold_seconds: 2.5,
        time_bonus: 10.0,
    },
    TaskSpot {
        name: "проверить входную дверь",
        hint: "подойди к входной двери",
        position: Vec3::new(8.0, 0.0, 9.1),
        look_at: Vec3::new(8.0, 1.3, 10.0),
        hold_seconds: 2.5,
        time_bonus: 12.0,
    },
    TaskSpot {
        name: "помыть посуду",
        hint: "подойди к мойке",
        position: Vec3::new(12.4, 0.0, -8.5),
        look_at: Vec3::new(12.4, 1.0, -9.45),
        hold_seconds: 4.0,
        time_bonus: 14.0,
    },
    TaskSpot {
        name: "закрыть холодильник",
        hint: "подойди к холодильнику",
        position: Vec3::new(18.3, 0.0, -7.2),
        look_at: Vec3::new(19.4, 1.3, -7.2),
        hold_seconds: 2.0,
        time_bonus: 10.0,
    },
    TaskSpot {
        name: "вытереть стол",
        hint: "подойди к обеденному столу",
        position: Vec3::new(14.2, 0.0, -3.0),
        look_at: Vec3::new(14.2, 0.85, -4.0),
        hold_seconds: 3.0,
        time_bonus: 12.0,
    },
    TaskSpot {
        name: "выключить компьютер",
        hint: "подойди к рабочему столу",
        position: Vec3::new(17.0, 0.0, 5.0),
        look_at: Vec3::new(19.6, 1.35, 5.0),
        hold_seconds: 3.0,
        time_bonus: 14.0,
    },
    TaskSpot {
        name: "запереть сейф",
        hint: "подойди к сейфу",
        position: Vec3::new(18.4, 0.0, 9.0),
        look_at: Vec3::new(19.5, 0.75, 9.35),
        hold_seconds: 2.5,
        time_bonus: 10.0,
    },
    TaskSpot {
        name: "собрать бумаги",
        hint: "подойди к полкам",
        position: Vec3::new(14.4, 0.0, 9.0),
        look_at: Vec3::new(14.4, 1.0, 9.6),
        hold_seconds: 3.5,
        time_bonus: 12.0,
    },
];

#[derive(Clone, Copy)]
struct TaskSpot {
    name: &'static str,
    hint: &'static str,
    position: Vec3,
    look_at: Vec3,
    hold_seconds: f32,
    time_bonus: f32,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum GameMode {
    Menu,
    Playing,
    Paused,
    Ended,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum MonsterMode {
    Away,
    Warning,
    Entering,
    Hunting,
    Chase,
    Leaving,
}

#[derive(Clone, Copy)]
struct RectCollider {
    min_x: f32,
    max_x: f32,
    min_z: f32,
    max_z: f32,
}

#[derive(Clone, Copy)]
struct HideSpot {
    name: &'static str,
    position: Vec3,
    exit: Vec3,
    yaw: f32,
}

#[derive(Clone, Copy)]
struct PlayerState {
    position: Vec3,
    yaw: f32,
    pitch: f32,
    stamina: f32,
    breath: f32,
    noise: f32,
    hidden: Option<usize>,
    flashlight: bool,
    holding_breath: bool,
    moving: bool,
    sprinting: bool,
    gasped: bool,
    bob: f32,
}

impl Default for PlayerState {
    fn default() -> Self {
        Self {
            position: Vec3::new(0.0, 0.0, 2.6),
            yaw: -std::f32::consts::FRAC_PI_2,
            pitch: 0.0,
            stamina: 100.0,
            breath: 100.0,
            noise: 0.0,
            hidden: None,
            flashlight: true,
            holding_breath: false,
            moving: false,
            sprinting: false,
            gasped: false,
            bob: 0.0,
        }
    }
}

#[derive(Clone)]
struct MonsterState {
    position: Vec3,
    facing: f32,
    mode: MonsterMode,
    timer: f32,
    awareness: f32,
    exposure: f32,
    target: Option<usize>,
    last_seen: Option<Vec3>,
    lost_timer: f32,
    alerted_hide: bool,
    stuck: f32,
    path: Vec<Vec3>,
    path_index: usize,
    path_target: Option<Vec3>,
    repath_timer: f32,
    room: usize,
    anim: f32,
}

impl Default for MonsterState {
    fn default() -> Self {
        Self {
            position: Vec3::new(8.0, 0.0, 10.0),
            facing: std::f32::consts::PI,
            mode: MonsterMode::Away,
            timer: 10.0,
            awareness: 0.0,
            exposure: 0.0,
            target: None,
            last_seen: None,
            lost_timer: 0.0,
            alerted_hide: false,
            stuck: 0.0,
            path: Vec::new(),
            path_index: 0,
            path_target: None,
            repath_timer: 0.0,
            room: 0,
            anim: 0.0,
        }
    }
}

#[derive(Resource)]
struct GameState {
    mode: GameMode,
    elapsed: f32,
    player: PlayerState,
    monster: MonsterState,
    notice: String,
    notice_timer: f32,
    notice_danger: bool,
    end_title: String,
    end_text: String,
    random_seed: u32,
    step_timer: f32,
    tasks_done: [bool; 10],
    task_progress: f32,
    active_task: Option<usize>,
}

impl Default for GameState {
    fn default() -> Self {
        Self {
            mode: GameMode::Menu,
            elapsed: 0.0,
            player: PlayerState::default(),
            monster: MonsterState::default(),
            notice: String::new(),
            notice_timer: 0.0,
            notice_danger: false,
            end_title: String::new(),
            end_text: String::new(),
            random_seed: 123_456_789,
            step_timer: 0.0,
            tasks_done: [false; 10],
            task_progress: 0.0,
            active_task: None,
        }
    }
}

#[derive(Event, Clone, Copy)]
enum SoundEvent {
    Step { sprinting: bool },
    Knock,
    Alert,
    Caught,
    Dawn,
    Click,
    Rustle,
    Gasp,
    TaskDone,
    Heartbeat { danger: f32 },
}

#[derive(Resource)]
struct SoundAssets {
    hum: Handle<AudioSource>,
    step_walk: Handle<AudioSource>,
    step_sprint: Handle<AudioSource>,
    knock: Handle<AudioSource>,
    alert: Handle<AudioSource>,
    caught: Handle<AudioSource>,
    dawn: Handle<AudioSource>,
    click: Handle<AudioSource>,
    rustle: Handle<AudioSource>,
    gasp: Handle<AudioSource>,
    task_done: Handle<AudioSource>,
    heartbeat: Handle<AudioSource>,
}

#[derive(Resource)]
struct HeartbeatTimer {
    timer: f32,
}

#[derive(Component)]
struct PlayerCamera;

#[derive(Component)]
struct Flashlight;

#[derive(Component)]
struct MonsterEntity;

#[derive(Component)]
struct MenuRoot;

#[derive(Component)]
struct PauseRoot;

#[derive(Component)]
struct EndRoot;

#[derive(Component)]
struct ClockText;

#[derive(Component)]
struct ObjectiveText;

#[derive(Component)]
struct NoticeText;

#[derive(Component)]
struct DangerText;

#[derive(Component)]
struct InteractionText;

#[derive(Component)]
struct EndText;

#[derive(Component)]
struct StaminaFill;

#[derive(Component)]
struct BreathFill;

#[derive(Component)]
struct Crosshair;

#[derive(Component)]
struct HiddenMask;

#[derive(Component)]
struct BreathRow;

#[derive(Component)]
struct WarningLight;

#[derive(Component)]
struct TaskMarker(usize);

#[derive(Component)]
struct TaskText;

struct EmbeddedAssetsPlugin;

impl Plugin for EmbeddedAssetsPlugin {
    fn build(&self, app: &mut App) {
        embedded_asset!(app, "../assets/fonts/consola.ttf");
        embedded_asset!(app, "../assets/monster.glb");
    }
}

fn embedded_uri(relative: &'static str) -> AssetPath<'static> {
    let path = embedded_path!("src", relative);
    AssetPath::from(path).with_source(AssetSourceId::from("embedded"))
}

fn main() {
    App::new()
        .insert_resource(ClearColor(Color::rgb(0.018, 0.026, 0.03)))
        .insert_resource(AmbientLight {
            color: Color::rgb(0.56, 0.64, 0.60),
            brightness: 0.16,
        })
        .insert_resource(GameState::default())
        .insert_resource(HeartbeatTimer { timer: 0.0 })
        .insert_resource(Msaa::Off)
        .insert_resource(PointLightShadowMap { size: 512 })
        .insert_resource(DirectionalLightShadowMap { size: 512 })
        .add_event::<SoundEvent>()
        .add_plugins(
            DefaultPlugins
                .set(WindowPlugin {
                    primary_window: Some(Window {
                        title: "До шести — Rust".to_string(),
                        resolution: (1100.0, 700.0).into(),
                        ..default()
                    }),
                    ..default()
                })
                .disable::<GilrsPlugin>(),
        )
        .add_plugins(EmbeddedAssetsPlugin)
        .add_systems(Startup, (setup, prepare_audio))
        .add_systems(
            Update,
            (
                (
                    advance_time,
                    handle_input,
                    update_player,
                    update_monster,
                    update_monster_visual,
                    update_camera,
                    update_flashlight,
                    update_ui_visibility,
                    update_ui_extras,
                    update_clock_text,
                ),
                (
                    update_objective_text,
                    update_notice_text,
                    update_danger_text,
                    update_interaction_text,
                    update_end_text,
                    update_meter_fills,
                    update_danger_colors,
                    update_tasks,
                    update_task_text,
                    update_task_markers,
                    heartbeat_audio,
                    play_sound_events,
                ),
            )
                .chain(),
        )
        .run();
}

fn setup(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
    asset_server: Res<AssetServer>,
    state: Res<GameState>,
) {
    let font = asset_server.load(embedded_uri("../assets/fonts/consola.ttf"));
    build_room(&mut commands, &mut meshes, &mut materials);

    commands.spawn((
        Camera3dBundle {
            transform: player_camera_transform(&state.player),
            projection: Projection::Perspective(PerspectiveProjection {
                fov: 72.0f32.to_radians(),
                near: 0.05,
                far: 45.0,
                ..default()
            }),
            ..default()
        },
        FogSettings {
            color: Color::rgb(0.02, 0.027, 0.031),
            falloff: FogFalloff::ExponentialSquared { density: 0.045 },
            ..default()
        },
        PlayerCamera,
    ));

    commands.spawn((
        SpotLightBundle {
            spot_light: SpotLight {
                color: Color::rgb(0.96, 0.94, 0.84),
                intensity: 900_000.0,
                range: 13.0,
                radius: 0.15,
                inner_angle: 0.25,
                outer_angle: 0.58,
                shadows_enabled: true,
                ..default()
            },
            transform: player_camera_transform(&state.player),
            ..default()
        },
        Flashlight,
    ));

    commands.spawn(PointLightBundle {
        point_light: PointLight {
            color: Color::rgb(0.45, 0.60, 0.51),
            intensity: 900.0,
            range: 3.0,
            ..default()
        },
        transform: Transform::from_xyz(-0.15, 1.3, -2.85),
        ..default()
    });

    commands.spawn(PointLightBundle {
        point_light: PointLight {
            color: Color::srgb_u8(217, 195, 154),
            intensity: 750.0,
            range: 9.0,
            ..default()
        },
        transform: Transform::from_xyz(14.2, 2.7, -4.6),
        ..default()
    });

    commands.spawn(PointLightBundle {
        point_light: PointLight {
            color: Color::srgb_u8(127, 209, 168),
            intensity: 500.0,
            range: 3.2,
            ..default()
        },
        transform: Transform::from_xyz(19.2, 1.1, -7.2),
        ..default()
    });

    commands.spawn(PointLightBundle {
        point_light: PointLight {
            color: Color::srgb_u8(240, 201, 138),
            intensity: 600.0,
            range: 4.5,
            ..default()
        },
        transform: Transform::from_xyz(17.75, 1.25, 4.72),
        ..default()
    });

    commands.spawn(PointLightBundle {
        point_light: PointLight {
            color: Color::srgb_u8(159, 183, 166),
            intensity: 600.0,
            range: 9.0,
            ..default()
        },
        transform: Transform::from_xyz(15.4, 2.7, 6.4),
        ..default()
    });

    commands.spawn((
        PointLightBundle {
            point_light: PointLight {
                color: Color::srgb_u8(181, 46, 36),
                intensity: 0.0,
                range: 3.5,
                ..default()
            },
            transform: Transform::from_xyz(8.0, 0.2, 10.0),
            ..default()
        },
        WarningLight,
    ));

    commands.spawn((
        SceneBundle {
            scene: asset_server.load(embedded_uri("../assets/monster.glb").with_label("Scene0")),
            transform: monster_transform(&state.monster),
            ..default()
        },
        MonsterEntity,
    ));

    commands.spawn((
        TextBundle::from_section(
            "12:00",
            TextStyle {
                font: font.clone(),
                font_size: 30.0,
                color: Color::rgb(0.86, 0.91, 0.87),
                ..default()
            },
        )
        .with_style(Style {
            position_type: PositionType::Absolute,
            top: Val::Px(14.0),
            left: Val::Px(16.0),
            ..default()
        }),
        ClockText,
    ));

    commands.spawn((
        TextBundle::from_section(
            "Доживи до 6:00",
            TextStyle {
                font: font.clone(),
                font_size: 15.0,
                color: Color::rgb(0.58, 0.65, 0.60),
                ..default()
            },
        )
        .with_style(Style {
            position_type: PositionType::Absolute,
            top: Val::Px(18.0),
            left: Val::Px(430.0),
            ..default()
        }),
        ObjectiveText,
    ));

    commands.spawn((
        TextBundle::from_section(
            "",
            TextStyle {
                font: font.clone(),
                font_size: 15.0,
                color: Color::rgb(0.83, 0.88, 0.84),
                ..default()
            },
        )
        .with_style(Style {
            position_type: PositionType::Absolute,
            top: Val::Px(42.0),
            left: Val::Px(360.0),
            width: Val::Px(380.0),
            ..default()
        }),
        NoticeText,
    ));

    commands.spawn((
        TextBundle::from_section(
            "Пока тихо",
            TextStyle {
                font: font.clone(),
                font_size: 13.0,
                color: Color::rgb(0.52, 0.58, 0.54),
                ..default()
            },
        )
        .with_style(Style {
            position_type: PositionType::Absolute,
            top: Val::Px(18.0),
            right: Val::Px(18.0),
            ..default()
        }),
        DangerText,
    ));

    commands.spawn((
        TextBundle::from_section(
            "",
            TextStyle {
                font: font.clone(),
                font_size: 13.0,
                color: Color::rgb(0.85, 0.90, 0.86),
                ..default()
            },
        )
        .with_style(Style {
            position_type: PositionType::Absolute,
            bottom: Val::Px(18.0),
            left: Val::Px(50.0),
            width: Val::Px(220.0),
            ..default()
        }),
        InteractionText,
    ));

    commands
        .spawn(NodeBundle {
            style: Style {
                position_type: PositionType::Absolute,
                bottom: Val::Px(24.0),
                left: Val::Px(26.0),
                width: Val::Px(145.0),
                flex_direction: FlexDirection::Column,
                row_gap: Val::Px(8.0),
                ..default()
            },
            ..default()
        })
        .with_children(|parent| {
            parent
                .spawn(NodeBundle {
                    style: Style {
                        width: Val::Px(145.0),
                        height: Val::Px(4.0),
                        ..default()
                    },
                    background_color: BackgroundColor(Color::rgba(1.0, 1.0, 1.0, 0.09)),
                    ..default()
                })
                .with_children(|bar| {
                    bar.spawn((
                        NodeBundle {
                            style: Style {
                                width: Val::Percent(100.0),
                                height: Val::Percent(100.0),
                                ..default()
                            },
                            background_color: BackgroundColor(Color::rgb(0.678, 0.776, 0.71)),
                            ..default()
                        },
                        StaminaFill,
                    ));
                });
            parent
                .spawn((
                    NodeBundle {
                        style: Style {
                            width: Val::Px(145.0),
                            height: Val::Px(4.0),
                            ..default()
                        },
                        background_color: BackgroundColor(Color::rgba(1.0, 1.0, 1.0, 0.09)),
                        visibility: Visibility::Hidden,
                        ..default()
                    },
                    BreathRow,
                ))
                .with_children(|bar| {
                    bar.spawn((
                        NodeBundle {
                            style: Style {
                                width: Val::Percent(100.0),
                                height: Val::Percent(100.0),
                                ..default()
                            },
                            background_color: BackgroundColor(Color::rgb(0.58, 0.722, 0.784)),
                            ..default()
                        },
                        BreathFill,
                    ));
                });
        });

    commands.spawn((
        NodeBundle {
            style: Style {
                position_type: PositionType::Absolute,
                top: Val::Percent(50.0),
                left: Val::Percent(50.0),
                width: Val::Px(4.0),
                height: Val::Px(4.0),
                margin: UiRect {
                    left: Val::Px(-2.0),
                    top: Val::Px(-2.0),
                    ..default()
                },
                ..default()
            },
            background_color: BackgroundColor(Color::rgba(0.847, 0.894, 0.862, 0.6)),
            visibility: Visibility::Hidden,
            ..default()
        },
        Crosshair,
    ));

    commands.spawn((
        NodeBundle {
            style: Style {
                position_type: PositionType::Absolute,
                width: Val::Percent(100.0),
                height: Val::Percent(100.0),
                ..default()
            },
            background_color: BackgroundColor(Color::rgba(0.008, 0.012, 0.012, 0.72)),
            visibility: Visibility::Hidden,
            ..default()
        },
        HiddenMask,
    ));

    for (index, spot) in TASK_SPOTS.iter().enumerate() {
        commands.spawn((
            PbrBundle {
                mesh: meshes.add(Cuboid::new(0.14, 0.14, 0.14)),
                material: materials.add(StandardMaterial {
                    emissive: Color::rgb(0.95, 0.78, 0.3).into(),
                    ..default()
                }),
                transform: Transform::from_translation(spot.look_at),
                ..default()
            },
            TaskMarker(index),
        ));
    }

    commands.spawn((
        TextBundle::from_section(
            "",
            TextStyle {
                font: font.clone(),
                font_size: 14.0,
                color: Color::rgb(0.9, 0.82, 0.6),
                ..default()
            },
        )
        .with_style(Style {
            position_type: PositionType::Absolute,
            bottom: Val::Px(64.0),
            left: Val::Px(50.0),
            width: Val::Px(300.0),
            ..default()
        }),
        TaskText,
    ));

    commands
        .spawn((
            NodeBundle {
                style: Style {
                    width: Val::Percent(100.0),
                    height: Val::Percent(100.0),
                    position_type: PositionType::Absolute,
                    flex_direction: FlexDirection::Column,
                    align_items: AlignItems::Center,
                    justify_content: JustifyContent::Center,
                    ..default()
                },
                background_color: BackgroundColor(Color::rgba(0.015, 0.025, 0.025, 0.94)),
                ..default()
            },
            MenuRoot,
        ))
        .with_children(|parent| {
            parent.spawn(TextBundle::from_section(
                "ДО ШЕСТИ\n\nТы слышишь шаги за дверью. Оно войдёт.\nНе дай ему найти тебя и продержись до утра.\n\nWASD или стрелки — движение\nЗажми ЛКМ и двигай мышь — обзор\nShift — бег\nE — спрятаться / выйти, у точек с жёлтым маркером — задача\nF — фонарик (в том числе в укрытии, но свет выдаёт)\nПробел — задержать дыхание\nEsc или P — пауза\n\nЗадачи ускоряют ночь, но во время работы ты шумишь.\n\nНажми Enter, чтобы начать ночь",
                TextStyle {
                    font: font.clone(),
                    font_size: 25.0,
                    color: Color::rgb(0.89, 0.92, 0.89),
                    ..default()
                },
            ));
        });

    commands
        .spawn((
            NodeBundle {
                style: Style {
                    width: Val::Percent(100.0),
                    height: Val::Percent(100.0),
                    position_type: PositionType::Absolute,
                    flex_direction: FlexDirection::Column,
                    align_items: AlignItems::Center,
                    justify_content: JustifyContent::Center,
                    ..default()
                },
                background_color: BackgroundColor(Color::rgba(0.01, 0.015, 0.018, 0.88)),
                ..default()
            },
            PauseRoot,
        ))
        .with_children(|parent| {
            parent.spawn(TextBundle::from_section(
                "ПАУЗА\n\nНажми Enter, Esc или P, чтобы продолжить",
                TextStyle {
                    font: font.clone(),
                    font_size: 30.0,
                    color: Color::rgb(0.89, 0.92, 0.89),
                    ..default()
                },
            ));
        });

    commands
        .spawn((
            NodeBundle {
                style: Style {
                    width: Val::Percent(100.0),
                    height: Val::Percent(100.0),
                    position_type: PositionType::Absolute,
                    flex_direction: FlexDirection::Column,
                    align_items: AlignItems::Center,
                    justify_content: JustifyContent::Center,
                    ..default()
                },
                background_color: BackgroundColor(Color::rgba(0.01, 0.012, 0.014, 0.91)),
                ..default()
            },
            EndRoot,
        ))
        .with_children(|parent| {
            parent.spawn((
                TextBundle::from_section(
                    "",
                    TextStyle {
                        font: font.clone(),
                        font_size: 30.0,
                        color: Color::rgb(0.89, 0.92, 0.89),
                        ..default()
                    },
                ),
                EndText,
            ));
        });
}

fn build_room(
    commands: &mut Commands,
    meshes: &mut Assets<Mesh>,
    materials: &mut Assets<StandardMaterial>,
) {
    let mat_floor = materials.add(Color::srgb(0.14, 0.16, 0.14));
    let mat_floor_alt = materials.add(Color::srgb(0.12, 0.14, 0.12));
    let mat_wall = materials.add(Color::srgb(0.25, 0.27, 0.25));
    let mat_trim = materials.add(Color::srgb(0.12, 0.14, 0.12));
    let mat_wood = materials.add(Color::srgb(0.27, 0.25, 0.20));
    let mat_wood_dark = materials.add(Color::srgb(0.18, 0.16, 0.13));
    let mat_metal = materials.add(Color::srgb(0.42, 0.44, 0.40));
    let mat_mattress = materials.add(Color::srgb(0.44, 0.45, 0.41));
    let mat_blanket = materials.add(Color::srgb(0.22, 0.30, 0.26));
    let mat_pillow = materials.add(Color::srgb(0.65, 0.63, 0.55));
    let mat_paper = materials.add(Color::srgb(0.68, 0.66, 0.57));
    let mat_rug = materials.add(Color::srgb(0.18, 0.22, 0.19));
    let mat_black = materials.add(Color::srgb(0.04, 0.06, 0.05));
    let mat_window = materials.add(StandardMaterial {
        base_color: Color::srgb(0.11, 0.22, 0.30),
        emissive: Color::srgb(0.08, 0.16, 0.22).into(),
        ..default()
    });
    let mat_screen = materials.add(StandardMaterial {
        base_color: Color::srgb(0.12, 0.32, 0.22),
        emissive: Color::srgb(0.15, 0.35, 0.25).into(),
        ..default()
    });

    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(12.000, 0.140, 8.000), Vec3::new(0.000, -0.080, 0.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(-5.500, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(-5.000, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(-4.500, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(-4.000, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(-3.500, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(-3.000, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(-2.500, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(-2.000, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(-1.500, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(-1.000, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(-0.500, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(0.000, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(0.500, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(1.000, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(1.500, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(2.000, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(2.500, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(3.000, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(3.500, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(4.000, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(4.500, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(5.000, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(0.480, 0.012, 7.850), Vec3::new(5.500, 0.003, 0.000));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(0.160, 3.500, 8.000), Vec3::new(-6.080, 1.750, 0.000));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(12.000, 3.500, 0.160), Vec3::new(0.000, 1.750, -4.080));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(12.000, 3.500, 0.160), Vec3::new(0.000, 1.750, 4.080));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(0.160, 3.500, 3.250), Vec3::new(6.080, 1.750, -2.375));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(0.160, 3.500, 3.250), Vec3::new(6.080, 1.750, 2.375));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(0.160, 1.100, 1.500), Vec3::new(6.080, 2.950, 0.000));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(11.800, 0.160, 0.080), Vec3::new(0.000, 0.120, -3.880));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(11.800, 0.160, 0.080), Vec3::new(0.000, 0.120, 3.880));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(0.080, 0.160, 7.800), Vec3::new(-5.880, 0.120, 0.000));
    spawn_box_mat(commands, meshes, mat_rug.clone(), Vec3::new(3.400, 0.025, 2.100), Vec3::new(-0.500, 0.020, 0.450));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(3.920, 0.140, 20.160), Vec3::new(8.080, -0.080, 0.000));
    spawn_box_mat(commands, meshes, mat_rug.clone(), Vec3::new(1.500, 0.020, 14.000), Vec3::new(8.000, 0.015, 0.600));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(4.160, 3.500, 0.160), Vec3::new(8.080, 1.750, -10.160));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(1.100, 3.500, 0.160), Vec3::new(6.550, 1.750, 10.160));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(1.260, 3.500, 0.160), Vec3::new(9.530, 1.750, 10.160));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(1.800, 0.850, 0.160), Vec3::new(8.000, 3.080, 10.160));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(0.160, 3.500, 4.080), Vec3::new(10.080, 1.750, -8.040));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(0.160, 3.500, 8.800), Vec3::new(10.080, 1.750, 0.000));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(0.160, 3.500, 4.080), Vec3::new(10.080, 1.750, 8.040));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(0.160, 0.850, 1.600), Vec3::new(10.080, 3.080, -5.200));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(0.160, 0.850, 1.600), Vec3::new(10.080, 3.080, 5.200));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(0.240, 2.700, 0.120), Vec3::new(10.080, 1.350, -6.000));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(0.240, 2.700, 0.120), Vec3::new(10.080, 1.350, -4.400));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(0.240, 2.700, 0.120), Vec3::new(10.080, 1.350, 4.400));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(0.240, 2.700, 0.120), Vec3::new(10.080, 1.350, 6.000));
    // Corridor west walls north and south of bedroom doorway
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(0.160, 3.500, 6.080), Vec3::new(6.080, 1.750, -7.120));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(0.160, 3.500, 6.080), Vec3::new(6.080, 1.750, 7.120));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.550, 2.300, 1.250), Vec3::new(6.450, 1.150, 6.800));
    spawn_box_mat(commands, meshes, mat_wood.clone(), Vec3::new(0.050, 2.100, 0.600), Vec3::new(6.740, 1.120, 6.490));
    spawn_box_mat(commands, meshes, mat_wood.clone(), Vec3::new(0.050, 2.100, 0.600), Vec3::new(6.740, 1.120, 7.110));
    spawn_box_mat(commands, meshes, mat_metal.clone(), Vec3::new(0.040, 0.300, 0.040), Vec3::new(6.770, 1.150, 6.720));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.060, 0.080, 1.400), Vec3::new(6.180, 1.850, 8.900));
    spawn_box_mat(commands, meshes, mat_wood.clone(), Vec3::new(0.500, 0.100, 1.200), Vec3::new(6.450, 0.450, 8.900));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.080, 0.450, 0.080), Vec3::new(6.250, 0.230, 8.450));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.080, 0.450, 0.080), Vec3::new(6.250, 0.230, 9.350));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(10.000, 0.140, 10.200), Vec3::new(15.080, -0.080, -5.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(0.560, 0.012, 9.900), Vec3::new(10.600, 0.004, -5.000));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(0.560, 0.012, 9.900), Vec3::new(11.200, 0.004, -5.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(0.560, 0.012, 9.900), Vec3::new(11.800, 0.004, -5.000));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(0.560, 0.012, 9.900), Vec3::new(12.400, 0.004, -5.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(0.560, 0.012, 9.900), Vec3::new(13.000, 0.004, -5.000));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(0.560, 0.012, 9.900), Vec3::new(13.600, 0.004, -5.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(0.560, 0.012, 9.900), Vec3::new(14.200, 0.004, -5.000));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(0.560, 0.012, 9.900), Vec3::new(14.800, 0.004, -5.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(0.560, 0.012, 9.900), Vec3::new(15.400, 0.004, -5.000));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(0.560, 0.012, 9.900), Vec3::new(16.000, 0.004, -5.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(0.560, 0.012, 9.900), Vec3::new(16.600, 0.004, -5.000));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(0.560, 0.012, 9.900), Vec3::new(17.200, 0.004, -5.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(0.560, 0.012, 9.900), Vec3::new(17.800, 0.004, -5.000));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(0.560, 0.012, 9.900), Vec3::new(18.400, 0.004, -5.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(0.560, 0.012, 9.900), Vec3::new(19.000, 0.004, -5.000));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(0.560, 0.012, 9.900), Vec3::new(19.600, 0.004, -5.000));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(10.160, 3.500, 0.160), Vec3::new(15.080, 1.750, -10.160));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(0.160, 3.500, 10.400), Vec3::new(20.080, 1.750, -5.040));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(10.160, 3.500, 0.160), Vec3::new(15.080, 1.750, 0.080));
    spawn_box_mat(commands, meshes, mat_wood.clone(), Vec3::new(5.400, 0.860, 0.720), Vec3::new(13.100, 0.430, -9.480));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(5.600, 0.080, 0.820), Vec3::new(13.100, 0.900, -9.480));
    spawn_box_mat(commands, meshes, mat_metal.clone(), Vec3::new(0.900, 0.040, 0.480), Vec3::new(12.300, 0.930, -9.480));
    spawn_box_mat(commands, meshes, mat_metal.clone(), Vec3::new(0.060, 0.340, 0.060), Vec3::new(12.300, 1.080, -9.720));
    spawn_box_mat(commands, meshes, mat_wood.clone(), Vec3::new(5.200, 0.720, 0.340), Vec3::new(13.100, 2.200, -9.820));
    spawn_box_mat(commands, meshes, mat_window.clone(), Vec3::new(1.700, 1.100, 0.040), Vec3::new(12.300, 2.080, -10.060));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(1.860, 0.070, 0.100), Vec3::new(12.300, 2.660, -10.000));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(1.860, 0.070, 0.100), Vec3::new(12.300, 1.500, -10.000));
    spawn_box_mat(commands, meshes, mat_metal.clone(), Vec3::new(1.000, 1.900, 0.900), Vec3::new(19.500, 0.950, -7.200));
    spawn_box_mat(commands, meshes, mat_metal.clone(), Vec3::new(0.040, 0.900, 0.040), Vec3::new(18.980, 1.200, -7.200));
    spawn_box_mat(commands, meshes, mat_wood.clone(), Vec3::new(2.200, 0.100, 1.200), Vec3::new(14.200, 0.780, -4.000));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.120, 0.760, 0.120), Vec3::new(13.300, 0.390, -4.420));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.120, 0.760, 0.120), Vec3::new(15.100, 0.390, -4.420));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.120, 0.760, 0.120), Vec3::new(13.300, 0.390, -3.580));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.120, 0.760, 0.120), Vec3::new(15.100, 0.390, -3.580));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.420, 0.060, 0.420), Vec3::new(13.500, 0.450, -2.980));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.420, 0.060, 0.100), Vec3::new(13.500, 0.850, -2.800));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.420, 0.060, 0.420), Vec3::new(15.000, 0.450, -2.980));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.420, 0.060, 0.100), Vec3::new(15.000, 0.850, -2.800));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.420, 0.060, 0.420), Vec3::new(13.500, 0.450, -4.980));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.420, 0.060, 0.100), Vec3::new(13.500, 0.850, -5.160));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.420, 0.060, 0.420), Vec3::new(15.000, 0.450, -4.980));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.420, 0.060, 0.100), Vec3::new(15.000, 0.850, -5.160));
    spawn_box_mat(commands, meshes, mat_paper.clone(), Vec3::new(0.500, 0.040, 0.500), Vec3::new(15.100, 0.850, -4.000));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.850, 2.200, 1.500), Vec3::new(19.550, 1.100, -2.200));
    spawn_box_mat(commands, meshes, mat_wood.clone(), Vec3::new(0.050, 2.000, 0.680), Vec3::new(19.100, 1.060, -2.560));
    spawn_box_mat(commands, meshes, mat_wood.clone(), Vec3::new(0.050, 2.000, 0.680), Vec3::new(19.100, 1.060, -1.840));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(0.040, 0.500, 0.040), Vec3::new(14.200, 2.900, -4.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(10.000, 0.140, 10.000), Vec3::new(15.080, -0.080, 5.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(9.800, 0.012, 0.660), Vec3::new(15.080, 0.004, 0.700));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(9.800, 0.012, 0.660), Vec3::new(15.080, 0.004, 1.400));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(9.800, 0.012, 0.660), Vec3::new(15.080, 0.004, 2.100));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(9.800, 0.012, 0.660), Vec3::new(15.080, 0.004, 2.800));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(9.800, 0.012, 0.660), Vec3::new(15.080, 0.004, 3.500));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(9.800, 0.012, 0.660), Vec3::new(15.080, 0.004, 4.200));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(9.800, 0.012, 0.660), Vec3::new(15.080, 0.004, 4.900));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(9.800, 0.012, 0.660), Vec3::new(15.080, 0.004, 5.600));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(9.800, 0.012, 0.660), Vec3::new(15.080, 0.004, 6.300));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(9.800, 0.012, 0.660), Vec3::new(15.080, 0.004, 7.000));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(9.800, 0.012, 0.660), Vec3::new(15.080, 0.004, 7.700));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(9.800, 0.012, 0.660), Vec3::new(15.080, 0.004, 8.400));
    spawn_box_mat(commands, meshes, mat_floor.clone(), Vec3::new(9.800, 0.012, 0.660), Vec3::new(15.080, 0.004, 9.100));
    spawn_box_mat(commands, meshes, mat_floor_alt.clone(), Vec3::new(9.800, 0.012, 0.660), Vec3::new(15.080, 0.004, 9.800));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(10.160, 3.500, 0.160), Vec3::new(15.080, 1.750, 10.160));
    spawn_box_mat(commands, meshes, mat_wall.clone(), Vec3::new(0.160, 3.500, 10.400), Vec3::new(20.080, 1.750, 5.040));
    spawn_box_mat(commands, meshes, mat_wood.clone(), Vec3::new(2.600, 0.120, 0.950), Vec3::new(18.700, 0.790, 5.000));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.100, 0.760, 0.100), Vec3::new(17.500, 0.380, 4.620));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.100, 0.760, 0.100), Vec3::new(19.900, 0.380, 4.620));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.100, 0.760, 0.100), Vec3::new(17.500, 0.380, 5.380));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.100, 0.760, 0.100), Vec3::new(19.900, 0.380, 5.380));
    spawn_box_mat(commands, meshes, mat_black.clone(), Vec3::new(0.060, 0.620, 0.980), Vec3::new(19.820, 1.400, 5.000));
    spawn_box_mat(commands, meshes, mat_screen.clone(), Vec3::new(0.020, 0.520, 0.860), Vec3::new(19.780, 1.400, 5.000));
    spawn_box_mat(commands, meshes, mat_metal.clone(), Vec3::new(0.160, 0.240, 0.260), Vec3::new(19.860, 0.980, 5.000));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.500, 0.100, 0.500), Vec3::new(18.200, 0.500, 5.000));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.500, 0.550, 0.080), Vec3::new(18.200, 0.800, 5.240));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.500, 0.550, 0.080), Vec3::new(18.200, 0.800, 4.760));
    spawn_box_mat(commands, meshes, mat_metal.clone(), Vec3::new(0.220, 0.040, 0.220), Vec3::new(17.750, 0.870, 4.720));
    spawn_box_mat(commands, meshes, mat_metal.clone(), Vec3::new(0.050, 0.400, 0.050), Vec3::new(17.750, 1.070, 4.720));
    spawn_box_mat(commands, meshes, mat_metal.clone(), Vec3::new(0.200, 0.140, 0.200), Vec3::new(17.750, 1.300, 4.720));
    spawn_box_mat(commands, meshes, mat_wood.clone(), Vec3::new(3.200, 0.080, 0.420), Vec3::new(14.600, 1.000, 9.720));
    spawn_box_mat(commands, meshes, mat_wood.clone(), Vec3::new(3.200, 0.080, 0.420), Vec3::new(14.600, 1.620, 9.720));
    spawn_box_mat(commands, meshes, mat_wood.clone(), Vec3::new(3.200, 0.080, 0.420), Vec3::new(14.600, 2.240, 9.720));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.080, 2.400, 0.420), Vec3::new(13.000, 1.200, 9.720));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.080, 2.400, 0.420), Vec3::new(16.200, 1.200, 9.720));
    spawn_box_mat(commands, meshes, mat_paper.clone(), Vec3::new(0.500, 0.160, 0.300), Vec3::new(13.900, 1.120, 9.700));
    spawn_box_mat(commands, meshes, mat_paper.clone(), Vec3::new(0.420, 0.120, 0.280), Vec3::new(15.200, 1.740, 9.700));
    spawn_box_mat(commands, meshes, mat_paper.clone(), Vec3::new(0.500, 0.200, 0.300), Vec3::new(14.600, 2.360, 9.700));
    spawn_box_mat(commands, meshes, mat_metal.clone(), Vec3::new(0.700, 0.700, 0.650), Vec3::new(19.500, 0.350, 9.350));
    spawn_box_mat(commands, meshes, mat_metal.clone(), Vec3::new(0.060, 0.200, 0.060), Vec3::new(19.140, 0.420, 9.350));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.550, 2.300, 1.500), Vec3::new(10.450, 1.150, 8.200));
    spawn_box_mat(commands, meshes, mat_wood.clone(), Vec3::new(0.050, 2.100, 0.680), Vec3::new(10.740, 1.120, 7.860));
    spawn_box_mat(commands, meshes, mat_wood.clone(), Vec3::new(0.050, 2.100, 0.680), Vec3::new(10.740, 1.120, 8.540));
    spawn_box_mat(commands, meshes, mat_paper.clone(), Vec3::new(2.400, 1.200, 0.050), Vec3::new(14.400, 1.900, 0.200));
    spawn_box_mat(commands, meshes, mat_metal.clone(), Vec3::new(2.520, 0.060, 0.080), Vec3::new(14.400, 2.530, 0.200));
    spawn_box_mat(commands, meshes, mat_blanket.clone(), Vec3::new(0.900, 0.120, 0.850), Vec3::new(12.600, 0.420, 2.600));
    spawn_box_mat(commands, meshes, mat_blanket.clone(), Vec3::new(0.120, 0.900, 0.850), Vec3::new(12.100, 0.720, 2.600));
    spawn_box_mat(commands, meshes, mat_rug.clone(), Vec3::new(1.600, 0.020, 1.200), Vec3::new(14.500, 0.020, 4.600));
    spawn_box_mat(commands, meshes, mat_window.clone(), Vec3::new(0.040, 1.300, 1.800), Vec3::new(20.000, 2.000, 7.200));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(0.100, 0.070, 1.960), Vec3::new(20.020, 2.680, 7.200));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(0.100, 0.070, 1.960), Vec3::new(20.020, 1.320, 7.200));
    spawn_box_mat(commands, meshes, mat_window.clone(), Vec3::new(2.150, 1.500, 0.040), Vec3::new(1.750, 2.050, -3.900));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(2.350, 0.090, 0.100), Vec3::new(1.750, 2.820, -3.840));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(2.350, 0.090, 0.100), Vec3::new(1.750, 1.280, -3.840));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(0.090, 1.600, 0.100), Vec3::new(0.620, 2.050, -3.840));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(0.090, 1.600, 0.100), Vec3::new(2.880, 2.050, -3.840));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(0.060, 1.500, 0.080), Vec3::new(1.750, 2.050, -3.810));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(2.150, 0.060, 0.080), Vec3::new(1.750, 2.050, -3.810));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(3.100, 0.220, 2.050), Vec3::new(-3.600, 0.420, -2.300));
    spawn_box_mat(commands, meshes, mat_mattress.clone(), Vec3::new(2.950, 0.300, 1.900), Vec3::new(-3.600, 0.660, -2.300));
    spawn_box_mat(commands, meshes, mat_blanket.clone(), Vec3::new(1.750, 0.060, 1.920), Vec3::new(-3.050, 0.840, -2.300));
    spawn_box_mat(commands, meshes, mat_pillow.clone(), Vec3::new(0.720, 0.160, 1.100), Vec3::new(-4.550, 0.870, -2.300));
    spawn_box_mat(commands, meshes, mat_wood.clone(), Vec3::new(0.140, 1.550, 2.120), Vec3::new(-5.140, 0.950, -2.300));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.120, 0.420, 0.120), Vec3::new(-4.850, 0.210, -3.100));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.120, 0.420, 0.120), Vec3::new(-4.850, 0.210, -1.500));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.120, 0.420, 0.120), Vec3::new(-2.350, 0.210, -3.100));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.120, 0.420, 0.120), Vec3::new(-2.350, 0.210, -1.500));
    // Bedside nightstand
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.650, 0.600, 0.650), Vec3::new(-1.800, 0.300, -3.200));
    // Perimeter windows
    // Bedroom west window
    spawn_box_mat(commands, meshes, mat_window.clone(), Vec3::new(0.040, 1.500, 2.000), Vec3::new(-6.040, 2.000, 1.500));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(0.100, 0.090, 2.200), Vec3::new(-6.040, 2.780, 1.500));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(0.100, 0.090, 2.200), Vec3::new(-6.040, 1.220, 1.500));
    // Corridor north window
    spawn_box_mat(commands, meshes, mat_window.clone(), Vec3::new(1.800, 1.600, 0.040), Vec3::new(8.080, 2.050, -10.120));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(2.000, 0.090, 0.100), Vec3::new(8.080, 2.850, -10.120));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(2.000, 0.090, 0.100), Vec3::new(8.080, 1.250, -10.120));
    // Kitchen east window
    spawn_box_mat(commands, meshes, mat_window.clone(), Vec3::new(0.040, 1.400, 1.800), Vec3::new(20.040, 2.000, -4.500));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(0.100, 0.090, 2.000), Vec3::new(20.040, 2.700, -4.500));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(0.100, 0.090, 2.000), Vec3::new(20.040, 1.300, -4.500));
    // Workroom south window
    spawn_box_mat(commands, meshes, mat_window.clone(), Vec3::new(1.800, 1.400, 0.040), Vec3::new(15.080, 2.000, 10.120));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(2.000, 0.090, 0.100), Vec3::new(15.080, 2.700, 10.120));
    spawn_box_mat(commands, meshes, mat_trim.clone(), Vec3::new(2.000, 0.090, 0.100), Vec3::new(15.080, 1.300, 10.120));
    spawn_box_mat(commands, meshes, mat_wood.clone(), Vec3::new(2.500, 0.130, 0.920), Vec3::new(-0.200, 0.870, -3.200));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.100, 0.850, 0.100), Vec3::new(-1.280, 0.430, -3.530));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.100, 0.850, 0.100), Vec3::new(-1.280, 0.430, -2.870));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.100, 0.850, 0.100), Vec3::new(0.880, 0.430, -3.530));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.100, 0.850, 0.100), Vec3::new(0.880, 0.430, -2.870));
    spawn_box_mat(commands, meshes, mat_black.clone(), Vec3::new(0.850, 0.550, 0.080), Vec3::new(-0.150, 1.280, -3.420));
    spawn_box_mat(commands, meshes, mat_screen.clone(), Vec3::new(0.740, 0.440, 0.020), Vec3::new(-0.150, 1.280, -3.370));
    spawn_box_mat(commands, meshes, mat_metal.clone(), Vec3::new(0.080, 0.350, 0.080), Vec3::new(-0.150, 0.990, -3.400));
    spawn_box_mat(commands, meshes, mat_paper.clone(), Vec3::new(0.550, 0.015, 0.400), Vec3::new(-0.900, 0.950, -3.050));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.120, 2.750, 1.450), Vec3::new(3.900, 1.380, -2.750));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.120, 2.750, 1.450), Vec3::new(5.400, 1.380, -2.750));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(1.500, 2.750, 0.100), Vec3::new(4.650, 1.380, -3.450));
    spawn_box_mat(commands, meshes, mat_wood.clone(), Vec3::new(1.500, 0.120, 1.450), Vec3::new(4.650, 2.700, -2.750));
    spawn_box_mat(commands, meshes, mat_wood.clone(), Vec3::new(1.500, 0.120, 1.450), Vec3::new(4.650, 0.080, -2.750));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(1.400, 0.070, 1.300), Vec3::new(4.650, 1.550, -2.750));
    spawn_box_mat(commands, meshes, mat_wood.clone(), Vec3::new(2.050, 0.130, 1.300), Vec3::new(1.100, 0.800, 1.200));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.120, 0.780, 0.120), Vec3::new(0.250, 0.390, 0.700));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.120, 0.780, 0.120), Vec3::new(0.250, 0.390, 1.700));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.120, 0.780, 0.120), Vec3::new(1.950, 0.390, 0.700));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.120, 0.780, 0.120), Vec3::new(1.950, 0.390, 1.700));
    spawn_box_mat(commands, meshes, mat_wood.clone(), Vec3::new(1.050, 0.620, 0.950), Vec3::new(-4.700, 0.310, 2.750));
    spawn_box_mat(commands, meshes, mat_wood_dark.clone(), Vec3::new(0.780, 0.550, 0.750), Vec3::new(-4.820, 0.890, 2.820));
    spawn_box_mat(commands, meshes, mat_paper.clone(), Vec3::new(0.070, 0.630, 0.970), Vec3::new(-4.700, 0.320, 2.750));
}

fn spawn_box_mat(
    commands: &mut Commands,
    meshes: &mut Assets<Mesh>,
    material: Handle<StandardMaterial>,
    size: Vec3,
    position: Vec3,
) {
    commands.spawn(PbrBundle {
        mesh: meshes.add(Cuboid::new(size.x, size.y, size.z)),
        material,
        transform: Transform::from_translation(position),
        ..default()
    });
}

#[allow(dead_code)]
fn spawn_box(
    commands: &mut Commands,
    meshes: &mut Assets<Mesh>,
    materials: &mut Assets<StandardMaterial>,
    size: Vec3,
    position: Vec3,
    color: Color,
) {
    commands.spawn(PbrBundle {
        mesh: meshes.add(Cuboid::new(size.x, size.y, size.z)),
        material: materials.add(color),
        transform: Transform::from_translation(position),
        ..default()
    });
}

fn player_camera_transform(player: &PlayerState) -> Transform {
    let bob = if player.moving && player.hidden.is_none() {
        player.bob.sin() * if player.sprinting { 0.045 } else { 0.025 }
    } else {
        0.0
    };
    let mut transform = Transform::from_translation(Vec3::new(
        player.position.x,
        1.55 + bob,
        player.position.z,
    ));
    transform.rotation = look_rotation(player.yaw, player.pitch);
    transform
}

fn look_rotation(yaw: f32, pitch: f32) -> Quat {
    Quat::from_axis_angle(Vec3::Y, yaw) * Quat::from_axis_angle(Vec3::X, pitch)
}

fn monster_transform(monster: &MonsterState) -> Transform {
    let mut transform = Transform::from_translation(Vec3::new(monster.position.x, 0.95, monster.position.z));
    transform.rotation = Quat::from_rotation_y(std::f32::consts::FRAC_PI_2 - monster.facing)
        * Quat::from_rotation_y(std::f32::consts::PI);
    transform.scale = Vec3::splat(1.9);
    transform
}

fn advance_time(time: Res<Time>, mut state: ResMut<GameState>, mut events: EventWriter<SoundEvent>) {
    if state.mode != GameMode::Playing {
        return;
    }
    let dt = time.delta_seconds();
    state.elapsed += dt;
    if state.notice_timer > 0.0 {
        state.notice_timer -= dt;
        if state.notice_timer <= 0.0 {
            state.notice.clear();
        }
    }
    if state.elapsed >= NIGHT_DURATION {
        state.elapsed = NIGHT_DURATION;
        end_game(&mut state, true, "", &mut events);
    }
}

fn handle_input(
    keyboard: Res<ButtonInput<KeyCode>>,
    mut state: ResMut<GameState>,
    mut events: EventWriter<SoundEvent>,
) {
    match state.mode {
        GameMode::Menu => {
            if keyboard.just_pressed(KeyCode::Enter) {
                start_new_game(&mut state);
            }
        }
        GameMode::Playing => {
            if keyboard.just_pressed(KeyCode::Escape) || keyboard.just_pressed(KeyCode::KeyP) {
                state.mode = GameMode::Paused;
            }
            if keyboard.just_pressed(KeyCode::KeyE) {
                let near_task = state.player.hidden.is_none()
                    && nearest_hide_spot(&state.player).is_none()
                    && nearest_task(&state.player, &state.tasks_done).is_some();
                if !near_task {
                    interact(&mut state, &mut events);
                }
            }
            if keyboard.just_pressed(KeyCode::KeyF) {
                state.player.flashlight = !state.player.flashlight;
                let message = if state.player.flashlight {
                    if state.player.hidden.is_some() {
                        "Фонарик включён. Свет может выдать твоё укрытие."
                    } else {
                        "Фонарик включён."
                    }
                } else {
                    "Фонарик выключен."
                };
                notify(&mut state, message, 1.8);
                events.send(SoundEvent::Click);
            }
        }
        GameMode::Paused => {
            if keyboard.just_pressed(KeyCode::Enter)
                || keyboard.just_pressed(KeyCode::Escape)
                || keyboard.just_pressed(KeyCode::KeyP)
            {
                state.mode = GameMode::Playing;
            }
        }
        GameMode::Ended => {
            if keyboard.just_pressed(KeyCode::Enter) {
                start_new_game(&mut state);
            }
        }
    }
}

fn start_new_game(state: &mut GameState) {
    let mut fresh = GameState::default();
    fresh.mode = GameMode::Playing;
    *state = fresh;
    notify(state, "Обойди дом: коридор, кухня, рабочая комната. Прячься и выполняй задания.", 4.5);
}

fn end_game(state: &mut GameState, won: bool, reason: &str, events: &mut EventWriter<SoundEvent>) {
    state.mode = GameMode::Ended;
    if won {
        state.end_title = "06:00 · РАССВЕТ\n\nТЫ ВЫЖИЛ".to_string();
        state.end_text = "Первый свет вошёл в комнату, и шаги исчезли.\n\nНажми Enter, чтобы начать следующую ночь.".to_string();
        events.send(SoundEvent::Dawn);
    } else {
        state.end_title = "ОНО НАШЛО ТЕБЯ".to_string();
        state.end_text = format!(
            "{}\n\nНажми Enter, чтобы попробовать снова.",
            if reason.is_empty() { "Тьма оказалась быстрее." } else { reason }
        );
        events.send(SoundEvent::Caught);
    }
}

fn notify(state: &mut GameState, text: &str, duration: f32) {
    state.notice = text.to_string();
    state.notice_timer = duration;
    state.notice_danger = false;
}

fn notify_danger(state: &mut GameState, text: &str, duration: f32) {
    notify(state, text, duration);
    state.notice_danger = true;
}

fn interact(state: &mut GameState, events: &mut EventWriter<SoundEvent>) {
    if let Some(index) = state.player.hidden {
        let spot = HIDE_SPOTS[index];
        state.player.hidden = None;
        state.player.position = spot.exit;
        state.player.yaw = spot.yaw;
        state.player.pitch = 0.0;
        state.monster.exposure = (state.monster.exposure - 0.2).max(0.0);
        notify(state, "Ты выбрался из укрытия.", 1.5);
        events.send(SoundEvent::Rustle);
        return;
    }

    let Some(index) = nearest_hide_spot(&state.player) else {
        notify(state, "Здесь негде спрятаться.", 1.4);
        return;
    };
    let spot = HIDE_SPOTS[index];
    let seen = state.monster.mode == MonsterMode::Chase
        && distance_xz(state.monster.position, spot.exit) < 6.0
        && has_line_of_sight(state.monster.position, spot.exit);

    state.player.hidden = Some(index);
    state.player.position = spot.position;
    state.player.yaw = spot.yaw;
    state.player.pitch = 0.0;
    state.player.noise = 10.0;
    state.player.breath = state.player.breath.max(55.0);
    state.monster.alerted_hide = seen;
    if seen {
        notify_danger(state, "Оно видело, куда ты спрятался!", 2.8);
    } else {
        notify(state, "Не двигайся. Слушай.", 2.0);
    }
    events.send(SoundEvent::Rustle);
}

fn nearest_hide_spot(player: &PlayerState) -> Option<usize> {
    let mut nearest = None;
    let mut nearest_distance = 1.3;
    for (index, spot) in HIDE_SPOTS.iter().enumerate() {
        let dist = distance_xz(player.position, spot.exit);
        if dist < nearest_distance {
            nearest = Some(index);
            nearest_distance = dist;
        }
    }
    nearest
}

fn update_player(
    time: Res<Time>,
    keyboard: Res<ButtonInput<KeyCode>>,
    mouse_buttons: Res<ButtonInput<MouseButton>>,
    mut mouse_motion: EventReader<MouseMotion>,
    mut state: ResMut<GameState>,
    mut events: EventWriter<SoundEvent>,
) {
    if state.mode != GameMode::Playing {
        mouse_motion.read().for_each(drop);
        return;
    }

    let dt = time.delta_seconds();
    let mut look = Vec2::ZERO;
    for event in mouse_motion.read() {
        look += event.delta;
    }
    if mouse_buttons.pressed(MouseButton::Left) && state.player.hidden.is_none() {
        state.player.yaw -= look.x * 0.0022;
        state.player.pitch = (state.player.pitch - look.y * 0.0022).clamp(-1.35, 1.35);
    }

    if let Some(index) = state.player.hidden {
        let _ = index;
        state.player.moving = false;
        state.player.sprinting = false;
        state.player.holding_breath = keyboard.pressed(KeyCode::Space) && state.player.breath > 0.0;
        if state.player.holding_breath {
            state.player.breath = (state.player.breath - 24.0 * dt).max(0.0);
        } else {
            state.player.breath = (state.player.breath + 17.0 * dt).min(100.0);
        }
        if state.player.breath <= 0.0 && !state.player.gasped {
            state.player.gasped = true;
            state.player.noise = 100.0;
            events.send(SoundEvent::Gasp);
            notify_danger(&mut state, "Ты не можешь больше задерживать дыхание!", 2.5);
        }
        if state.player.breath > 30.0 {
            state.player.gasped = false;
        }
        let target_noise = if state.player.holding_breath { 0.0 } else { 12.0 };
        state.player.noise += (target_noise - state.player.noise) * (dt * 5.0).min(1.0);
        return;
    }

    let vertical = keyboard.pressed(KeyCode::KeyW) as i8 as f32 - keyboard.pressed(KeyCode::KeyS) as i8 as f32
        + keyboard.pressed(KeyCode::ArrowUp) as i8 as f32
        - keyboard.pressed(KeyCode::ArrowDown) as i8 as f32;
    let horizontal = keyboard.pressed(KeyCode::KeyD) as i8 as f32 - keyboard.pressed(KeyCode::KeyA) as i8 as f32
        + keyboard.pressed(KeyCode::ArrowRight) as i8 as f32
        - keyboard.pressed(KeyCode::ArrowLeft) as i8 as f32;
    let input = Vec2::new(horizontal, vertical);
    let moving = input.length_squared() > 0.0;
    state.player.moving = moving;
    state.player.sprinting = moving
        && (keyboard.pressed(KeyCode::ShiftLeft) || keyboard.pressed(KeyCode::ShiftRight))
        && state.player.stamina > 0.5;

    if moving {
        state.player.bob += dt * if state.player.sprinting { 13.0 } else { 8.0 };
        let normalized = input.normalize();
        let forward = Vec3::new(-state.player.yaw.sin(), 0.0, -state.player.yaw.cos());
        let right = Vec3::new(state.player.yaw.cos(), 0.0, -state.player.yaw.sin());
        let direction = forward * normalized.y + right * normalized.x;
        let speed = if state.player.sprinting { 3.6 } else { 2.15 };
        move_player(&mut state.player, direction.x * speed * dt, direction.z * speed * dt);
    }

    if state.player.sprinting {
        state.player.stamina = (state.player.stamina - 25.0 * dt).max(0.0);
    } else {
        state.player.stamina = (state.player.stamina + (if moving { 13.0 } else { 19.0 }) * dt).min(100.0);
    }
    state.player.breath = (state.player.breath + 22.0 * dt).min(100.0);
    let target_noise = if moving { if state.player.sprinting { 85.0 } else { 30.0 } } else { 2.0 };
    state.player.noise += (target_noise - state.player.noise) * (dt * 7.0).min(1.0);
    if moving {
        state.step_timer -= dt;
        if state.step_timer <= 0.0 {
            events.send(SoundEvent::Step {
                sprinting: state.player.sprinting,
            });
            state.step_timer = if state.player.sprinting { 0.26 } else { 0.43 };
        }
    } else {
        state.step_timer = 0.0;
    }
}

fn move_player(player: &mut PlayerState, dx: f32, dz: f32) {
    let radius = 0.28;
    let next_x = player.position.x + dx;
    if !collides(next_x, player.position.z, radius) {
        player.position.x = next_x;
    }
    let next_z = player.position.z + dz;
    if !collides(player.position.x, next_z, radius) {
        player.position.z = next_z;
    }
}

fn update_monster(
    time: Res<Time>,
    mut state: ResMut<GameState>,
    mut events: EventWriter<SoundEvent>,
) {
    if state.mode != GameMode::Playing {
        return;
    }
    let dt = time.delta_seconds();
    let progress = state.elapsed / NIGHT_DURATION;
    let player_visible;

    match state.monster.mode {
        MonsterMode::Away => {
            state.monster.timer -= dt;
            if state.monster.timer <= 0.0 {
                state.monster.mode = MonsterMode::Warning;
                state.monster.timer = 3.4;
                state.monster.position = Vec3::new(8.0, 0.0, 10.0);
                notify_danger(&mut state, "Шаги остановились у входной двери.", 3.0);
                events.send(SoundEvent::Knock);
            }
        }
        MonsterMode::Warning => {
            state.monster.timer -= dt;
            if state.monster.timer <= 0.0 {
                state.monster.mode = MonsterMode::Entering;
                state.monster.timer = 2.2;
                state.monster.position = Vec3::new(8.0, 0.0, 10.0);
                state.monster.target = None;
                state.monster.alerted_hide = false;
                state.monster.stuck = 0.0;
                notify_danger(&mut state, "Оно вошло в дом.", 2.4);
                events.send(SoundEvent::Alert);
            }
        }
        MonsterMode::Entering => {
            state.monster.timer -= dt;
            let remaining = move_monster_direct(&mut state, Vec3::new(8.0, 0.0, 8.5), 0.85, dt);
            if remaining < 0.22
                || state.monster.timer <= 0.0
                || (state.monster.position.z < 9.5 && state.monster.stuck < 0.4)
            {
                begin_hunt(&mut state);
            }
        }
        MonsterMode::Hunting => {
            state.monster.timer -= dt;
            if state.monster.timer <= 0.0 {
                begin_leaving(&mut state);
            } else {
                player_visible = can_see_player(&state);
                if state.player.hidden.is_none() {
                    if player_visible {
                        let rate = if state.player.flashlight { 1.55 } else { 1.15 }
                            * if state.player.sprinting { 1.25 } else { 1.0 };
                        state.monster.awareness = (state.monster.awareness + rate * dt).min(1.0);
                        state.monster.last_seen = Some(state.player.position);
                    } else {
                        state.monster.awareness = (state.monster.awareness - 0.22 * dt).max(0.0);
                        let dist = distance_xz(state.monster.position, state.player.position);
                        let noise_range = if state.player.sprinting { 8.0 } else { 5.5 };
                        if state.player.moving && dist < noise_range {
                            let rate = if state.player.sprinting { 0.65 } else { 0.34 };
                            state.monster.awareness = (state.monster.awareness + rate * dt).min(1.0);
                            state.monster.last_seen = Some(state.player.position);
                        } else if state.task_progress > 0.0 && dist < 7.5 {
                            state.monster.awareness = (state.monster.awareness + 0.5 * dt).min(1.0);
                            state.monster.last_seen = Some(state.player.position);
                        }
                    }
                    if state.monster.awareness >= 0.85 {
                        state.monster.mode = MonsterMode::Chase;
                        state.monster.lost_timer = 3.2;
                        state.monster.last_seen = Some(state.player.position);
                        notify_danger(&mut state, "Оно тебя увидело. Беги!", 2.5);
                        events.send(SoundEvent::Alert);
                    }
                } else {
                    state.monster.awareness = (state.monster.awareness - dt).max(0.0);
                }

                if state.monster.mode == MonsterMode::Hunting {
                    if state.monster.target.is_none()
                        || distance_xz(
                            state.monster.position,
                            PATROL_POINTS[state.monster.target.unwrap_or(0)],
                        ) < 0.25
                    {
                        choose_patrol_target(&mut state);
                    }
                    let target = PATROL_POINTS[state.monster.target.unwrap_or(0)];
                    move_monster(&mut state, target, 0.78 + progress * 0.22, dt);
                }
            }
        }
        MonsterMode::Chase => {
            if state.player.hidden.is_some() {
                if state.monster.alerted_hide {
                    let exit = HIDE_SPOTS[state.player.hidden.unwrap()].exit;
                    move_monster(&mut state, exit, 1.35, dt);
                } else {
                    state.monster.mode = MonsterMode::Hunting;
                    state.monster.awareness = 0.2;
                    choose_patrol_target(&mut state);
                }
            } else {
                let player_distance = distance_xz(state.monster.position, state.player.position);
                let sees = can_see_player(&state)
                    || (player_distance < 2.2
                        && has_line_of_sight(state.monster.position, state.player.position));
                if sees {
                    state.monster.last_seen = Some(state.player.position);
                    state.monster.lost_timer = 3.2;
                } else {
                    state.monster.lost_timer -= dt;
                    if state.player.moving && player_distance < 5.5 {
                        state.monster.last_seen = Some(state.player.position);
                        state.monster.lost_timer = state.monster.lost_timer.max(1.2);
                    }
                }
                let target = state.monster.last_seen.unwrap_or(state.player.position);
                move_monster(&mut state, target, 1.55 + progress * 0.3, dt);
                if distance_xz(state.monster.position, state.player.position) < 0.86 {
                    end_game(&mut state, false, "Оно догнало тебя.", &mut events);
                } else if state.monster.lost_timer <= 0.0 {
                    state.monster.mode = MonsterMode::Hunting;
                    state.monster.awareness = 0.25;
                    choose_patrol_target(&mut state);
                    notify(&mut state, "Оно потеряло тебя из виду.", 2.0);
                }
            }
        }
        MonsterMode::Leaving => {
            state.monster.timer -= dt;
            let remaining = move_monster(&mut state, Vec3::new(8.0, 0.0, 10.3), 1.05, dt);
            if remaining < 0.3 || state.monster.position.z > 9.9 || state.monster.timer <= 0.0 || state.monster.stuck > 1.2 {
                state.monster.mode = MonsterMode::Away;
                state.monster.timer = 9.0 + next_random(&mut state) * 5.0 - progress * 3.0;
                state.monster.position = Vec3::new(8.0, 0.0, 10.0);
                state.monster.awareness = 0.0;
                state.monster.exposure = 0.0;
                state.monster.alerted_hide = false;
                state.monster.path.clear();
                state.monster.path_target = None;
                state.monster.stuck = 0.0;
            }
        }
    }

    if state.mode == GameMode::Playing {
        state.monster.anim += dt
            * match state.monster.mode {
                MonsterMode::Chase => 1.7,
                MonsterMode::Leaving | MonsterMode::Entering => 1.1,
                MonsterMode::Hunting => 1.0,
                MonsterMode::Away | MonsterMode::Warning => 0.35,
            };
        update_exposure(&mut state, dt, &mut events);
    }
}

fn nearest_task(player: &PlayerState, tasks_done: &[bool; 10]) -> Option<usize> {
    let mut nearest = None;
    let mut nearest_distance = 1.35;
    for (index, spot) in TASK_SPOTS.iter().enumerate() {
        if tasks_done[index] {
            continue;
        }
        let dist = distance_xz(player.position, spot.position);
        if dist < nearest_distance {
            nearest = Some(index);
            nearest_distance = dist;
        }
    }
    nearest
}

fn update_tasks(
    time: Res<Time>,
    keyboard: Res<ButtonInput<KeyCode>>,
    mut state: ResMut<GameState>,
    mut events: EventWriter<SoundEvent>,
) {
    if state.mode != GameMode::Playing || state.player.hidden.is_some() {
        state.task_progress = 0.0;
        state.active_task = None;
        return;
    }
    let task = nearest_task(&state.player, &state.tasks_done);
    state.active_task = if nearest_hide_spot(&state.player).is_some() {
        None
    } else {
        task
    };
    let Some(index) = task else {
        state.task_progress = 0.0;
        return;
    };
    let spot = TASK_SPOTS[index];
    if state.active_task.is_some() && keyboard.pressed(KeyCode::KeyE) {
        state.task_progress += time.delta_seconds() / spot.hold_seconds;
        state.player.noise = state.player.noise.max(45.0);
        if state.task_progress >= 1.0 {
            state.tasks_done[index] = true;
            state.task_progress = 0.0;
            state.active_task = None;
            state.elapsed = (state.elapsed + spot.time_bonus).min(NIGHT_DURATION);
            events.send(SoundEvent::TaskDone);
            notify(&mut state, &format!("«{}» выполнено — время приблизилось к утру.", spot.name), 2.8);
        }
    } else {
        state.task_progress = (state.task_progress - time.delta_seconds() * 1.5).max(0.0);
    }
}

fn begin_hunt(state: &mut GameState) {
    state.monster.mode = MonsterMode::Hunting;
    state.monster.timer = 12.0 + next_random(state) * 6.0 - (state.elapsed / NIGHT_DURATION) * 3.0;
    state.monster.awareness = 0.0;
    state.monster.path.clear();
    state.monster.path_target = None;
    state.monster.stuck = 0.0;
    choose_patrol_target(state);
}

fn begin_leaving(state: &mut GameState) {
    state.monster.mode = MonsterMode::Leaving;
    state.monster.timer = 12.0;
    state.monster.awareness = 0.0;
    state.monster.exposure = 0.0;
    state.monster.alerted_hide = false;
    state.monster.path.clear();
    state.monster.path_target = None;
    notify(state, "Шаги удаляются.", 2.2);
}

fn nearest_walkable_cell(
    x: f32,
    z: f32,
    cell: f32,
    min_x: f32,
    min_z: f32,
    cols: usize,
    rows: usize,
    walkable: &[bool],
) -> Option<usize> {
    let cx = ((x - min_x) / cell).round().clamp(0.0, cols as f32 - 1.0) as usize;
    let cz = ((z - min_z) / cell).round().clamp(0.0, rows as f32 - 1.0) as usize;
    if walkable[cz * cols + cx] {
        return Some(cz * cols + cx);
    }
    for radius in 1_i32..6 {
        for dz in -radius..=radius {
            for dx in -radius..=radius {
                if dx.abs().max(dz.abs()) != radius {
                    continue;
                }
                let nx = cx as i32 + dx;
                let nz = cz as i32 + dz;
                if nx < 0 || nx >= cols as i32 || nz < 0 || nz >= rows as i32 {
                    continue;
                }
                let index = nz as usize * cols + nx as usize;
                if walkable[index] {
                    return Some(index);
                }
            }
        }
    }
    None
}

fn get_nav_grid() -> &'static (usize, usize, f32, f32, Vec<bool>) {
    use std::sync::OnceLock;
    static NAV: OnceLock<(usize, usize, f32, f32, Vec<bool>)> = OnceLock::new();
    NAV.get_or_init(|| {
        const CELL: f32 = 0.35;
        const RADIUS: f32 = 0.36;
        let min_x = ROOM_MIN_X + RADIUS + 0.02;
        let min_z = ROOM_MIN_Z + RADIUS + 0.02;
        let cols = ((ROOM_MAX_X - ROOM_MIN_X - RADIUS * 2.0 - 0.04) / CELL).floor() as usize + 1;
        let rows = ((ROOM_MAX_Z - ROOM_MIN_Z - RADIUS * 2.0 - 0.04) / CELL).floor() as usize + 1;
        let total = cols * rows;
        let mut walkable = vec![false; total];
        for row in 0..rows {
            for col in 0..cols {
                walkable[row * cols + col] = !collides(min_x + col as f32 * CELL, min_z + row as f32 * CELL, RADIUS);
            }
        }
        (cols, rows, min_x, min_z, walkable)
    })
}

fn find_path(from: Vec3, to: Vec3) -> Option<Vec<Vec3>> {
    const CELL: f32 = 0.35;
    let &(cols, rows, min_x, min_z, ref walkable) = get_nav_grid();
    let total = cols * rows;
    let start = nearest_walkable_cell(from.x, from.z, CELL, min_x, min_z, cols, rows, walkable)?;
    let goal = nearest_walkable_cell(to.x, to.z, CELL, min_x, min_z, cols, rows, walkable)?;
    let mut came_from = vec![-1_i32; total];
    let mut g_score = vec![f32::INFINITY; total];
    let mut closed = vec![false; total];
    let mut open = vec![start];
    g_score[start] = 0.0;
    let heuristic = |index: usize| {
        let dx = (index % cols) as f32 - (goal % cols) as f32;
        let dz = (index / cols) as f32 - (goal / cols) as f32;
        dx.abs().max(dz.abs()) + 0.4142 * dx.abs().min(dz.abs())
    };
    let mut iterations = 0;
    while !open.is_empty() && iterations < total * 4 {
        iterations += 1;
        let mut best_position = 0_usize;
        let mut best_score = f32::INFINITY;
        for (position, &index) in open.iter().enumerate() {
            let score = g_score[index] + heuristic(index);
            if score < best_score {
                best_score = score;
                best_position = position;
            }
        }
        let current = open.swap_remove(best_position);
        if current == goal {
            let mut path = Vec::new();
            let mut cursor = Some(current);
            while let Some(index) = cursor {
                let col = index % cols;
                let row = index / cols;
                path.push(Vec3::new(min_x + col as f32 * CELL, 0.0, min_z + row as f32 * CELL));
                cursor = if came_from[index] >= 0 {
                    Some(came_from[index] as usize)
                } else {
                    None
                };
            }
            path.reverse();
            return Some(path);
        }
        closed[current] = true;
        let col = current % cols;
        let row = current / cols;
        for dz in -1_i32..=1 {
            for dx in -1_i32..=1 {
                if dx == 0 && dz == 0 {
                    continue;
                }
                let nx = col as i32 + dx;
                let nz = row as i32 + dz;
                if nx < 0 || nx >= cols as i32 || nz < 0 || nz >= rows as i32 {
                    continue;
                }
                let next = nz as usize * cols + nx as usize;
                if !walkable[next] || closed[next] {
                    continue;
                }
                if dx != 0 && dz != 0 && (!walkable[row * cols + nx as usize] || !walkable[nz as usize * cols + col]) {
                    continue;
                }
                let cost = g_score[current] + if dx != 0 && dz != 0 { 1.4142 } else { 1.0 };
                if cost < g_score[next] {
                    came_from[next] = current as i32;
                    g_score[next] = cost;
                    if !open.contains(&next) {
                        open.push(next);
                    }
                }
            }
        }
    }
    None
}

fn move_monster(state: &mut GameState, target: Vec3, speed: f32, dt: f32) -> f32 {
    let target_distance = distance_xz(state.monster.position, target);
    if target_distance < 0.02 || dt <= 0.0 {
        return target_distance;
    }
    state.monster.repath_timer -= dt;
    let target_moved = state
        .monster
        .path_target
        .map(|path_target| distance_xz(target, path_target) > 0.12)
        .unwrap_or(true);
    if state.monster.path.is_empty()
        || state.monster.path_index >= state.monster.path.len()
        || target_moved
        || state.monster.repath_timer <= 0.0
    {
        state.monster.path = find_path(state.monster.position, target).unwrap_or_default();
        state.monster.path_index = 0;
        state.monster.path_target = Some(target);
        state.monster.repath_timer = if state.monster.mode == MonsterMode::Chase { 0.22 } else { 0.65 };
    }
    let mut waypoint = target;
    if let Some(point) = state.monster.path.get(state.monster.path_index) {
        waypoint = *point;
    }
    while state.monster.path_index + 1 < state.monster.path.len()
        && distance_xz(state.monster.position, waypoint) < 0.18
    {
        state.monster.path_index += 1;
        waypoint = state.monster.path[state.monster.path_index];
    }
    let delta = waypoint - state.monster.position;
    let flat = Vec2::new(delta.x, delta.z);
    let waypoint_distance = flat.length().max(0.001);
    state.monster.facing = flat.y.atan2(flat.x);
    let step = flat / waypoint_distance * speed * dt;
    let before = state.monster.position;
    let radius = 0.34;
    let next_x = state.monster.position.x + step.x;
    if !collides(next_x, state.monster.position.z, radius) {
        state.monster.position.x = next_x;
    }
    let next_z = state.monster.position.z + step.y;
    if !collides(state.monster.position.x, next_z, radius) {
        state.monster.position.z = next_z;
    }
    let moved = distance_xz(before, state.monster.position);
    if moved < 0.001 {
        state.monster.stuck += dt;
        let away = (-flat.y).atan2(-flat.x);
        for i in 0..8 {
            let angle = away + (i as f32 - 3.5) * std::f32::consts::FRAC_PI_4;
            let sx = angle.cos() * 0.06;
            let sz = angle.sin() * 0.06;
            if !collides(state.monster.position.x + sx, state.monster.position.z + sz, radius) {
                state.monster.position.x += sx;
                state.monster.position.z += sz;
                break;
            }
        }
        state.monster.path.clear();
        state.monster.repath_timer = 0.0;
        if state.monster.mode == MonsterMode::Hunting && state.monster.stuck > 0.65 {
            choose_patrol_target(state);
        }
        if state.monster.mode == MonsterMode::Entering && state.monster.stuck > 1.2 {
            begin_hunt(state);
        }
    } else {
        state.monster.stuck = (state.monster.stuck - dt * 2.0).max(0.0);
    }
    target_distance
}

fn move_monster_direct(state: &mut GameState, target: Vec3, speed: f32, dt: f32) -> f32 {
    let delta = target - state.monster.position;
    let flat = Vec2::new(delta.x, delta.z);
    let dist = flat.length();
    if dist < 0.02 || dt <= 0.0 {
        return dist;
    }
    state.monster.facing = flat.y.atan2(flat.x);
    let step = flat.normalize() * speed * dt;
    let before = state.monster.position;
    let radius = 0.34;
    let next_x = state.monster.position.x + step.x;
    if !collides(next_x, state.monster.position.z, radius) {
        state.monster.position.x = next_x;
    }
    let next_z = state.monster.position.z + step.y;
    if !collides(state.monster.position.x, next_z, radius) {
        state.monster.position.z = next_z;
    }
    if distance_xz(before, state.monster.position) < 0.001 {
        state.monster.stuck += dt;
    } else {
        state.monster.stuck = (state.monster.stuck - dt * 2.0).max(0.0);
    }
    dist
}

fn choose_patrol_target(state: &mut GameState) {
    let room = state.monster.room.min(3);
    let start_idx = room * 3;
    let end_idx = start_idx + 3;
    let mut candidates: Vec<usize> = (start_idx..end_idx)
        .filter(|&index| distance_xz(state.monster.position, PATROL_POINTS[index]) > 0.9)
        .collect();
    if candidates.is_empty() {
        candidates = (start_idx..end_idx).collect();
    }
    let r = (next_random(state) * candidates.len() as f32) as usize;
    state.monster.target = Some(candidates[r.min(candidates.len() - 1)]);
    state.monster.path.clear();
    state.monster.path_target = None;
    state.monster.stuck = 0.0;
}

fn next_random(state: &mut GameState) -> f32 {
    state.random_seed = state
        .random_seed
        .wrapping_mul(1_664_525)
        .wrapping_add(1_013_904_223);
    state.random_seed as f32 / u32::MAX as f32
}

fn can_see_player(state: &GameState) -> bool {
    if state.player.hidden.is_some() {
        return false;
    }
    let dist = distance_xz(state.monster.position, state.player.position);
    let range = if state.player.flashlight { 8.5 } else { 6.5 };
    if dist > range || !has_line_of_sight(state.monster.position, state.player.position) {
        return false;
    }
    if dist < 1.6 || (state.player.flashlight && dist < 2.4) {
        return true;
    }
    let angle = (state.player.position.z - state.monster.position.z)
        .atan2(state.player.position.x - state.monster.position.x);
    let difference = wrap_angle(angle - state.monster.facing);
    difference.abs() < 1.25
}

fn has_line_of_sight(from: Vec3, to: Vec3) -> bool {
    let dist = distance_xz(from, to);
    let steps = (dist / 0.14).ceil().max(1.0) as i32;
    for i in 1..steps {
        let t = i as f32 / steps as f32;
        let x = from.x + (to.x - from.x) * t;
        let z = from.z + (to.z - from.z) * t;
        if COLLIDERS
            .iter()
            .any(|rect| x > rect.min_x && x < rect.max_x && z > rect.min_z && z < rect.max_z)
        {
            return false;
        }
    }
    true
}

fn update_exposure(state: &mut GameState, dt: f32, events: &mut EventWriter<SoundEvent>) {
    let Some(index) = state.player.hidden else {
        state.monster.exposure = (state.monster.exposure - dt).max(0.0);
        return;
    };
    if !matches!(
        state.monster.mode,
        MonsterMode::Entering | MonsterMode::Hunting | MonsterMode::Chase
    ) {
        state.monster.exposure = (state.monster.exposure - dt).max(0.0);
        return;
    }

    let exit = HIDE_SPOTS[index].exit;
    let dist = distance_xz(state.monster.position, exit);
    if dist < 1.65 {
        let lit = state.player.flashlight;
        if state.monster.alerted_hide && dist < 0.95 {
            state.monster.exposure += dt / 1.05;
        } else if (!state.player.holding_breath || lit) && !state.monster.alerted_hide {
            state.monster.exposure += dt / if lit { 1.2 } else { 1.7 };
        } else {
            state.monster.exposure = (state.monster.exposure - dt * 0.7).max(0.0);
        }
    } else {
        state.monster.exposure = (state.monster.exposure - dt * 0.65).max(0.0);
    }
    state.monster.exposure = state.monster.exposure.clamp(0.0, 1.0);
    if state.monster.exposure >= 1.0 {
        let reason = if state.monster.alerted_hide {
            "Оно видело, как ты спрятался."
        } else {
            "В тишине оно услышало твоё дыхание."
        };
        end_game(state, false, reason, events);
    }
}

fn collides(x: f32, z: f32, radius: f32) -> bool {
    if x - radius < ROOM_MIN_X || x + radius > ROOM_MAX_X || z - radius < ROOM_MIN_Z || z + radius > ROOM_MAX_Z {
        return true;
    }
    COLLIDERS.iter().any(|rect| {
        let closest_x = x.clamp(rect.min_x, rect.max_x);
        let closest_z = z.clamp(rect.min_z, rect.max_z);
        let dx = x - closest_x;
        let dz = z - closest_z;
        dx * dx + dz * dz < radius * radius
    })
}

fn distance_xz(a: Vec3, b: Vec3) -> f32 {
    Vec2::new(a.x - b.x, a.z - b.z).length()
}

fn wrap_angle(angle: f32) -> f32 {
    (angle + std::f32::consts::PI).rem_euclid(std::f32::consts::TAU) - std::f32::consts::PI
}

fn update_monster_visual(
    time: Res<Time>,
    state: Res<GameState>,
    mut query: Query<(&mut Transform, &mut Visibility), With<MonsterEntity>>,
    mut warning_light: Query<&mut PointLight, With<WarningLight>>,
) {
    if let Ok((mut transform, mut visibility)) = query.get_single_mut() {
        let visible = !matches!(state.monster.mode, MonsterMode::Away | MonsterMode::Warning);
        let target = if visible { Visibility::Visible } else { Visibility::Hidden };
        if *visibility != target {
            *visibility = target;
        }
        let mut next = monster_transform(&state.monster);
        let moving = matches!(
            state.monster.mode,
            MonsterMode::Entering | MonsterMode::Hunting | MonsterMode::Chase | MonsterMode::Leaving
        );
        let step = state.monster.anim * if state.monster.mode == MonsterMode::Chase { 11.0 } else { 7.0 };
        if visible {
            let bob = if moving {
                step.sin().abs() * 0.06
            } else {
                (state.monster.anim * 2.0).sin() * 0.02
            };
            next.translation.y = 0.95 + bob;
            let sway = if moving { step.sin() * 0.12 } else { 0.0 };
            let lean = if state.monster.mode == MonsterMode::Chase { 0.22 } else { 0.0 };
            next.rotation = next.rotation * Quat::from_rotation_z(sway) * Quat::from_rotation_x(lean);
        }
        if *transform != next {
            *transform = next;
        }
    }
    if let Ok(mut light) = warning_light.get_single_mut() {
        light.intensity = if state.monster.mode == MonsterMode::Warning {
            3.5 + (time.elapsed_seconds() * 7.7).sin() * 1.5
        } else {
            0.0
        };
    }
}

fn update_camera(state: Res<GameState>, mut query: Query<&mut Transform, With<PlayerCamera>>) {
    if !state.is_changed() {
        return;
    }
    if let Ok(mut transform) = query.get_single_mut() {
        *transform = player_camera_transform(&state.player);
        if let Some(index) = state.player.hidden {
            let spot = HIDE_SPOTS[index];
            transform.translation = spot.position;
            transform.rotation = look_rotation(spot.yaw, 0.0);
        }
    }
}

fn update_flashlight(
    state: Res<GameState>,
    mut query: Query<(&mut Transform, &mut SpotLight), With<Flashlight>>,
) {
    if !state.is_changed() {
        return;
    }
    if let Ok((mut transform, mut light)) = query.get_single_mut() {
        *transform = player_camera_transform(&state.player);
        if let Some(index) = state.player.hidden {
            let spot = HIDE_SPOTS[index];
            transform.translation = spot.position;
            transform.rotation = look_rotation(spot.yaw, 0.0);
        }
        let intensity = if state.player.flashlight { 900_000.0 } else { 0.0 };
        if light.intensity != intensity {
            light.intensity = intensity;
        }
        let cast_shadows = intensity > 0.0;
        if light.shadows_enabled != cast_shadows {
            light.shadows_enabled = cast_shadows;
        }
    }
}

fn update_ui_visibility(
    state: Res<GameState>,
    mut roots: ParamSet<(
        Query<&mut Visibility, With<MenuRoot>>,
        Query<&mut Visibility, With<PauseRoot>>,
        Query<&mut Visibility, With<EndRoot>>,
    )>,
) {
    let menu_visible = state.mode == GameMode::Menu;
    let pause_visible = state.mode == GameMode::Paused;
    let end_visible = state.mode == GameMode::Ended;
    for mut visibility in roots.p0().iter_mut() {
        let target = if menu_visible { Visibility::Visible } else { Visibility::Hidden };
        if *visibility != target {
            *visibility = target;
        }
    }
    for mut visibility in roots.p1().iter_mut() {
        let target = if pause_visible { Visibility::Visible } else { Visibility::Hidden };
        if *visibility != target {
            *visibility = target;
        }
    }
    for mut visibility in roots.p2().iter_mut() {
        let target = if end_visible { Visibility::Visible } else { Visibility::Hidden };
        if *visibility != target {
            *visibility = target;
        }
    }
}

fn update_clock_text(state: Res<GameState>, mut query: Query<&mut Text, With<ClockText>>) {
    if let Ok(mut text) = query.get_single_mut() {
        let value = format_time(state.elapsed);
        if text.sections[0].value != value {
            text.sections[0].value = value;
        }
    }
}

fn update_objective_text(state: Res<GameState>, mut query: Query<&mut Text, With<ObjectiveText>>) {
    if let Ok(mut text) = query.get_single_mut() {
        let value = if state.player.hidden.is_some() {
            "В укрытии · оставайся тихим".to_string()
        } else {
            let done = state.tasks_done.iter().filter(|&&d| d).count();
            format!("Задания {}/{} · доживи до 6:00", done, TASK_SPOTS.len())
        };
        if text.sections[0].value != value {
            text.sections[0].value = value;
        }
    }
}

fn update_notice_text(state: Res<GameState>, mut query: Query<&mut Text, With<NoticeText>>) {
    if let Ok(mut text) = query.get_single_mut() {
        if text.sections[0].value != state.notice {
            text.sections[0].value = state.notice.clone();
        }
    }
}

fn update_danger_text(state: Res<GameState>, mut query: Query<&mut Text, With<DangerText>>) {
    if let Ok(mut text) = query.get_single_mut() {
        let value = if close_to_hidden(&state) {
            "Оно совсем рядом"
        } else {
            match state.monster.mode {
                MonsterMode::Away => "Пока тихо",
                MonsterMode::Warning => "Оно у входной двери",
                MonsterMode::Entering => "Оно вошло",
                MonsterMode::Hunting => "Оно бродит по дому",
                MonsterMode::Chase => {
                    if state.player.hidden.is_some() {
                        "Оно ищет тебя"
                    } else {
                        "Оно видит тебя"
                    }
                }
                MonsterMode::Leaving => "Оно уходит",
            }
        };
        if text.sections[0].value != value {
            text.sections[0].value = value.to_string();
        }
    }
}

fn update_interaction_text(state: Res<GameState>, mut query: Query<&mut Text, With<InteractionText>>) {
    if let Ok(mut text) = query.get_single_mut() {
        let value: String = if state.mode != GameMode::Playing {
            String::new()
        } else if state.player.hidden.is_some() {
            if close_to_hidden(&state) {
                "Удерживай ПРОБЕЛ — не дыши".to_string()
            } else {
                "E — выйти из укрытия".to_string()
            }
        } else if let Some(index) = nearest_hide_spot(&state.player) {
            format!("E — спрятаться {}", HIDE_SPOTS[index].name)
        } else if state.monster.mode == MonsterMode::Chase {
            "Беги или незаметно спрячься".to_string()
        } else {
            String::new()
        };
        if text.sections[0].value != value {
            text.sections[0].value = value;
        }
    }
}

fn update_end_text(state: Res<GameState>, mut query: Query<&mut Text, With<EndText>>) {
    if state.mode == GameMode::Ended {
        if let Ok(mut text) = query.get_single_mut() {
            let value = format!("{}\n\n{}", state.end_title, state.end_text);
            if text.sections[0].value != value {
                text.sections[0].value = value;
            }
        }
    }
}

fn update_meter_fills(
    state: Res<GameState>,
    mut stamina: Query<&mut Style, (With<StaminaFill>, Without<BreathFill>)>,
    mut breath: Query<&mut Style, With<BreathFill>>,
) {
    if let Ok(mut style) = stamina.get_single_mut() {
        let width = Val::Percent(state.player.stamina.clamp(0.0, 100.0));
        if style.width != width {
            style.width = width;
        }
    }
    if let Ok(mut style) = breath.get_single_mut() {
        let width = Val::Percent(state.player.breath.clamp(0.0, 100.0));
        if style.width != width {
            style.width = width;
        }
    }
}

fn update_ui_extras(
    state: Res<GameState>,
    mut crosshair: Query<&mut Visibility, With<Crosshair>>,
    mut hidden_mask: Query<&mut Visibility, (With<HiddenMask>, Without<Crosshair>)>,
    mut breath_row: Query<&mut Visibility, (With<BreathRow>, Without<Crosshair>, Without<HiddenMask>)>,
) {
    let playing = state.mode == GameMode::Playing;
    let hidden = state.player.hidden.is_some();
    if let Ok(mut visibility) = crosshair.get_single_mut() {
        let target = if playing && !hidden {
            Visibility::Visible
        } else {
            Visibility::Hidden
        };
        if *visibility != target {
            *visibility = target;
        }
    }
    if let Ok(mut visibility) = hidden_mask.get_single_mut() {
        let target = if hidden { Visibility::Visible } else { Visibility::Hidden };
        if *visibility != target {
            *visibility = target;
        }
    }
    if let Ok(mut visibility) = breath_row.get_single_mut() {
        *visibility = if hidden { Visibility::Visible } else { Visibility::Hidden };
    }
}

fn update_danger_colors(
    state: Res<GameState>,
    mut danger: Query<&mut Text, With<DangerText>>,
    mut notice: Query<&mut Text, (With<NoticeText>, Without<DangerText>)>,
) {
    let alert = matches!(
        state.monster.mode,
        MonsterMode::Warning | MonsterMode::Entering | MonsterMode::Hunting | MonsterMode::Chase
    ) || close_to_hidden(&state);
    if let Ok(mut text) = danger.get_single_mut() {
        let color = if alert {
            Color::rgb(0.9, 0.545, 0.51)
        } else {
            Color::rgb(0.52, 0.58, 0.54)
        };
        if text.sections[0].style.color != color {
            text.sections[0].style.color = color;
        }
    }
    if let Ok(mut text) = notice.get_single_mut() {
        let color = if state.notice_danger && state.notice_timer > 0.0 {
            Color::rgb(0.937, 0.545, 0.502)
        } else {
            Color::rgb(0.83, 0.88, 0.84)
        };
        if text.sections[0].style.color != color {
            text.sections[0].style.color = color;
        }
    }
}

fn close_to_hidden(state: &GameState) -> bool {
    state.player.hidden.is_some()
        && distance_xz(state.monster.position, state.player.position) < 2.2
        && matches!(
            state.monster.mode,
            MonsterMode::Entering | MonsterMode::Hunting | MonsterMode::Chase
        )
}

fn update_task_markers(
    time: Res<Time>,
    state: Res<GameState>,
    mut markers: Query<(&TaskMarker, &mut Transform, &mut Visibility)>,
) {
    for (marker, mut transform, mut visibility) in markers.iter_mut() {
        let spot = TASK_SPOTS[marker.0];
        let done = state.tasks_done[marker.0];
        let target = if done {
            Visibility::Hidden
        } else {
            Visibility::Visible
        };
        if *visibility != target {
            *visibility = target;
        }
        if done {
            continue;
        }
        let pulse = 1.0 + (time.elapsed_seconds() * 2.4 + marker.0 as f32 * 2.1).sin() * 0.25;
        let next = Transform {
            translation: spot.look_at + Vec3::new(0.0, (time.elapsed_seconds() * 1.6 + marker.0 as f32).sin() * 0.05, 0.0),
            rotation: Quat::from_rotation_y(time.elapsed_seconds() * 0.9 + marker.0 as f32),
            scale: Vec3::splat(pulse),
        };
        if *transform != next {
            *transform = next;
        }
    }
}

fn update_task_text(state: Res<GameState>, mut query: Query<&mut Text, With<TaskText>>) {
    if let Ok(mut text) = query.get_single_mut() {
        let value: String = if state.mode != GameMode::Playing {
            String::new()
        } else if let Some(index) = state.active_task {
            let spot = TASK_SPOTS[index];
            if state.task_progress > 0.0 {
                format!("{} · {}%", spot.name, (state.task_progress * 100.0) as i32)
            } else {
                format!("Зажми E — {}", spot.hint)
            }
        } else {
            String::new()
        };
        if text.sections[0].value != value {
            text.sections[0].value = value;
        }
    }
}

fn format_time(elapsed: f32) -> String {
    let progress = (elapsed / NIGHT_DURATION).clamp(0.0, 1.0);
    let hour_index = (progress * 6.0).floor() as i32;
    let hour = if hour_index == 0 { 12 } else { hour_index };
    let minutes = ((progress * 360.0) as i32) % 60;
    format!("{:02}:{:02}", hour, minutes)
}

mod synth {
    pub const SAMPLE_RATE: f32 = 22050.0;
    const MASTER: f32 = 0.32;

    #[derive(Clone, Copy)]
    pub enum Wave {
        Sine,
        Square,
        Sawtooth,
    }

    pub struct Synth {
        samples: Vec<f32>,
        cursor: usize,
        rng: u32,
    }

    impl Synth {
        pub fn new() -> Self {
            Self {
                samples: Vec::new(),
                cursor: 0,
                rng: 0x2f6e_2b1d,
            }
        }

        fn white(&mut self) -> f32 {
            self.rng = self.rng.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
            ((self.rng >> 9) & 0x7f_ffff) as f32 / 0x7f_ffff as f32 * 2.0 - 1.0
        }

        fn ensure(&mut self, end: usize) {
            if self.samples.len() < end {
                self.samples.resize(end, 0.0);
            }
        }

        fn env(t: f32, seconds: f32) -> f32 {
            let attack = 0.012;
            if seconds <= attack {
                1.0
            } else if t < attack {
                t / attack
            } else {
                0.0001f32.powf((t - attack) / (seconds - attack))
            }
        }

        /// Добавляет тон относительно текущего курсора и продвигает курсор на конец тона.
        pub fn tone(&mut self, freq_start: f32, freq_end: f32, seconds: f32, volume: f32, wave: Wave) {
            let n = ((seconds * SAMPLE_RATE) as usize).max(1);
            self.ensure(self.cursor + n);
            let mut phase = 0.0f32;
            for i in 0..n {
                let t = i as f32 / SAMPLE_RATE;
                let freq = freq_start + (freq_end - freq_start) * (i as f32 / n as f32);
                phase += freq / SAMPLE_RATE;
                let raw = match wave {
                    Wave::Sine => (phase * std::f32::consts::TAU).sin(),
                    Wave::Square => {
                        if phase.fract() < 0.5 {
                            1.0
                        } else {
                            -1.0
                        }
                    }
                    Wave::Sawtooth => 2.0 * phase.fract() - 1.0,
                };
                self.samples[self.cursor + i] += raw * volume * Self::env(t, seconds) * MASTER;
            }
            self.cursor += n;
        }

        /// Добавляет тон со смещением от текущего курсора, не продвигая курсор.
        pub fn tone_at(&mut self, offset: f32, freq_start: f32, freq_end: f32, seconds: f32, volume: f32, wave: Wave) {
            let start = self.cursor + (offset * SAMPLE_RATE) as usize;
            let saved = self.cursor;
            self.cursor = start;
            self.tone(freq_start, freq_end, seconds, volume, wave);
            self.cursor = saved;
        }

        pub fn noise(&mut self, seconds: f32, volume: f32, brightness: f32) {
            let n = ((seconds * SAMPLE_RATE) as usize).max(1);
            self.ensure(self.cursor + n);
            let mut lp = 0.0f32;
            let a = brightness.clamp(0.02, 1.0);
            for i in 0..n {
                lp += a * (self.white() - lp);
                let t = i as f32 / SAMPLE_RATE;
                let env = (-t / seconds * 6.0).exp();
                self.samples[self.cursor + i] += lp * volume * env * MASTER;
            }
            self.cursor += n;
        }

        pub fn into_wav_bytes(self) -> Vec<u8> {
            let data_len = (self.samples.len() * 2) as u32;
            let mut bytes = Vec::with_capacity(44 + data_len as usize);
            bytes.extend_from_slice(b"RIFF");
            bytes.extend_from_slice(&(36 + data_len).to_le_bytes());
            bytes.extend_from_slice(b"WAVE");
            bytes.extend_from_slice(b"fmt ");
            bytes.extend_from_slice(&16u32.to_le_bytes());
            bytes.extend_from_slice(&1u16.to_le_bytes());
            bytes.extend_from_slice(&1u16.to_le_bytes());
            bytes.extend_from_slice(&(SAMPLE_RATE as u32).to_le_bytes());
            bytes.extend_from_slice(&((SAMPLE_RATE as u32) * 2).to_le_bytes());
            bytes.extend_from_slice(&2u16.to_le_bytes());
            bytes.extend_from_slice(&16u16.to_le_bytes());
            bytes.extend_from_slice(b"data");
            bytes.extend_from_slice(&data_len.to_le_bytes());
            for sample in self.samples {
                bytes.extend_from_slice(&((sample.clamp(-1.0, 1.0) * i16::MAX as f32) as i16).to_le_bytes());
            }
            bytes
        }
    }

    pub fn hum() -> Vec<u8> {
        let mut s = Synth::new();
        s.tone(46.0, 46.0, 2.0, 0.025, Wave::Sine);
        s.into_wav_bytes()
    }

    pub fn step(sprinting: bool) -> Vec<u8> {
        let mut s = Synth::new();
        if sprinting {
            s.noise(0.055, 0.065, 0.3);
            s.tone(90.0, 50.0, 0.05, 0.04, Wave::Sine);
        } else {
            s.noise(0.055, 0.025, 0.3);
            s.tone(72.0, 50.0, 0.05, 0.018, Wave::Sine);
        }
        s.into_wav_bytes()
    }

    pub fn knock() -> Vec<u8> {
        let mut s = Synth::new();
        s.tone(82.0, 43.0, 0.18, 0.32, Wave::Sine);
        s.noise(0.1, 0.12, 0.25);
        s.tone_at(0.42, 72.0, 38.0, 0.2, 0.25, Wave::Sine);
        s.into_wav_bytes()
    }

    pub fn alert() -> Vec<u8> {
        let mut s = Synth::new();
        s.tone(115.0, 48.0, 0.7, 0.09, Wave::Sawtooth);
        s.into_wav_bytes()
    }

    pub fn caught() -> Vec<u8> {
        let mut s = Synth::new();
        s.noise(0.65, 0.35, 0.5);
        s.tone(180.0, 32.0, 0.8, 0.22, Wave::Sawtooth);
        s.into_wav_bytes()
    }

    pub fn dawn() -> Vec<u8> {
        let mut s = Synth::new();
        for (index, note) in [261.6, 329.6, 392.0, 523.2].iter().enumerate() {
            s.tone_at(index as f32 * 0.16, *note, *note, 0.65, 0.08, Wave::Sine);
        }
        s.into_wav_bytes()
    }

    pub fn click() -> Vec<u8> {
        let mut s = Synth::new();
        s.tone(320.0, 220.0, 0.035, 0.025, Wave::Square);
        s.into_wav_bytes()
    }

    pub fn rustle() -> Vec<u8> {
        let mut s = Synth::new();
        s.noise(0.13, 0.05, 0.5);
        s.into_wav_bytes()
    }

    pub fn gasp() -> Vec<u8> {
        let mut s = Synth::new();
        s.noise(0.3, 0.16, 0.4);
        s.into_wav_bytes()
    }

    pub fn heartbeat() -> Vec<u8> {
        let mut s = Synth::new();
        s.tone(54.0, 38.0, 0.12, 0.18, Wave::Sine);
        s.tone_at(0.16, 48.0, 34.0, 0.1, 0.11, Wave::Sine);
        s.into_wav_bytes()
    }

    pub fn task_done() -> Vec<u8> {
        let mut s = Synth::new();
        s.tone(392.0, 392.0, 0.12, 0.1, Wave::Sine);
        s.tone_at(0.11, 523.2, 523.2, 0.2, 0.1, Wave::Sine);
        s.into_wav_bytes()
    }
}

fn prepare_audio(mut commands: Commands, mut assets: ResMut<Assets<AudioSource>>) {
    let mut add = |bytes: Vec<u8>| assets.add(AudioSource { bytes: bytes.into() });
    let sounds = SoundAssets {
        hum: add(synth::hum()),
        step_walk: add(synth::step(false)),
        step_sprint: add(synth::step(true)),
        knock: add(synth::knock()),
        alert: add(synth::alert()),
        caught: add(synth::caught()),
        dawn: add(synth::dawn()),
        click: add(synth::click()),
        rustle: add(synth::rustle()),
        gasp: add(synth::gasp()),
        task_done: add(synth::task_done()),
        heartbeat: add(synth::heartbeat()),
    };
    commands.spawn(AudioBundle {
        source: sounds.hum.clone(),
        settings: PlaybackSettings::LOOP,
    });
    commands.insert_resource(sounds);
}

fn play_sound_events(
    mut commands: Commands,
    sounds: Res<SoundAssets>,
    mut events: EventReader<SoundEvent>,
) {
    for event in events.read() {
        let (source, volume) = match event {
            SoundEvent::Step { sprinting } => (
                if *sprinting { &sounds.step_sprint } else { &sounds.step_walk },
                1.0,
            ),
            SoundEvent::Knock => (&sounds.knock, 1.0),
            SoundEvent::Alert => (&sounds.alert, 1.0),
            SoundEvent::Caught => (&sounds.caught, 1.0),
            SoundEvent::Dawn => (&sounds.dawn, 1.0),
            SoundEvent::Click => (&sounds.click, 1.0),
            SoundEvent::Rustle => (&sounds.rustle, 1.0),
            SoundEvent::Gasp => (&sounds.gasp, 1.0),
            SoundEvent::TaskDone => (&sounds.task_done, 1.0),
            SoundEvent::Heartbeat { danger } => (&sounds.heartbeat, 0.4 + danger.clamp(0.0, 1.0) * 0.6),
        };
        commands.spawn(AudioBundle {
            source: source.clone(),
            settings: PlaybackSettings::DESPAWN.with_volume(Volume::new(volume)),
        });
    }
}

fn heartbeat_audio(
    time: Res<Time>,
    state: Res<GameState>,
    mut beat: ResMut<HeartbeatTimer>,
    mut events: EventWriter<SoundEvent>,
) {
    if state.mode != GameMode::Playing {
        return;
    }
    let proximity = if state.monster.mode == MonsterMode::Away {
        0.0
    } else {
        (1.0 - distance_xz(state.monster.position, state.player.position) / 5.5).clamp(0.0, 1.0)
    };
    let danger = proximity.max(state.monster.awareness).max(state.monster.exposure);
    if danger < 0.2 {
        beat.timer = 0.0;
        return;
    }
    beat.timer -= time.delta_seconds();
    if beat.timer <= 0.0 {
        events.send(SoundEvent::Heartbeat { danger });
        beat.timer = 1.25 - danger * 0.72;
    }
}
