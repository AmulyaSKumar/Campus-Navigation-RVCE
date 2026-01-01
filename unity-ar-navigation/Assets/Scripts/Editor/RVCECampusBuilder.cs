using UnityEngine;
using UnityEditor;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;
using CampusNavigator.AR;

/// <summary>
/// Builds a complete 3D model of RVCE Campus matching the campus map
/// Menu: Campus Navigator > Build RVCE Campus 3D Model
/// </summary>
public class RVCECampusBuilder : EditorWindow
{
    // Campus dimensions (in Unity units, scaled from map)
    private const float CAMPUS_WIDTH = 200f;
    private const float CAMPUS_HEIGHT = 200f;
    private const float BUILDING_HEIGHT = 8f;
    private const float SMALL_BUILDING_HEIGHT = 5f;
    
    // Materials
    private static Material buildingMaterial;
    private static Material roadMaterial;
    private static Material grassMaterial;
    private static Material sportsMaterial;
    private static Material waterMaterial;
    private static Material accentMaterial;
    
    [MenuItem("Campus Navigator/Build RVCE Campus 3D Model")]
    public static void ShowWindow()
    {
        GetWindow<RVCECampusBuilder>("RVCE Campus Builder");
    }
    
    private void OnGUI()
    {
        GUILayout.Label("RVCE Campus 3D Model Builder", EditorStyles.boldLabel);
        GUILayout.Space(10);
        
        GUILayout.Label("This will create a complete 3D model of RVCE Campus", EditorStyles.wordWrappedLabel);
        GUILayout.Label("including all buildings, roads, gardens, and sports grounds.", EditorStyles.wordWrappedLabel);
        GUILayout.Space(20);
        
        if (GUILayout.Button("Build Campus Model", GUILayout.Height(40)))
        {
            BuildCampus();
        }
        
        GUILayout.Space(10);
        
        if (GUILayout.Button("Clear Existing Campus", GUILayout.Height(30)))
        {
            ClearCampus();
        }
    }
    
    private static void ClearCampus()
    {
        GameObject existing = GameObject.Find("RVCE_Campus");
        if (existing != null)
        {
            DestroyImmediate(existing);
            Debug.Log("Cleared existing campus model.");
        }
    }
    
    [MenuItem("Campus Navigator/Build RVCE Campus 3D Model (Quick)", false, 100)]
    public static void BuildCampus()
    {
        ClearCampus();
        
        // Create root object
        GameObject campus = new GameObject("RVCE_Campus");
        campus.transform.position = Vector3.zero;
        
        // Create materials
        CreateMaterials();
        
        // Create ground/base
        CreateGround(campus.transform);
        
        // Create roads
        CreateRoads(campus.transform);
        
        // Create all buildings
        CreateBuildings(campus.transform);
        
        // Create gardens and green areas
        CreateGardens(campus.transform);
        
        // Create sports grounds
        CreateSportsGrounds(campus.transform);
        
        // Create decorative elements
        CreateDecorations(campus.transform);
        
        // Setup camera
        SetupCamera();
        
        // Setup lighting
        SetupLighting();
        
        // Mark scene dirty
        UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(
            UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene());
        
        Debug.Log("RVCE Campus 3D Model built successfully!");
        
        // Focus on campus
        Selection.activeGameObject = campus;
        SceneView.lastActiveSceneView?.FrameSelected();
    }
    
    private static void CreateMaterials()
    {
        // Building material - light gray with slight blue tint
        buildingMaterial = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        buildingMaterial.color = new Color(0.85f, 0.87f, 0.9f, 1f);
        buildingMaterial.name = "BuildingMaterial";
        
        // Road material - dark gray
        roadMaterial = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        roadMaterial.color = new Color(0.3f, 0.3f, 0.32f, 1f);
        roadMaterial.name = "RoadMaterial";
        
        // Grass material - green
        grassMaterial = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        grassMaterial.color = new Color(0.2f, 0.6f, 0.2f, 1f);
        grassMaterial.name = "GrassMaterial";
        
        // Sports field material - bright green
        sportsMaterial = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        sportsMaterial.color = new Color(0.3f, 0.7f, 0.3f, 1f);
        sportsMaterial.name = "SportsMaterial";
        
        // Water/accent material - blue
        waterMaterial = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        waterMaterial.color = new Color(0.3f, 0.5f, 0.8f, 1f);
        waterMaterial.name = "WaterMaterial";
        
        // Accent material - teal/cyan for special buildings
        accentMaterial = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        accentMaterial.color = new Color(0.2f, 0.6f, 0.6f, 1f);
        accentMaterial.name = "AccentMaterial";
    }
    
    private static void CreateGround(Transform parent)
    {
        // Main ground plane
        GameObject ground = GameObject.CreatePrimitive(PrimitiveType.Cube);
        ground.name = "Ground";
        ground.transform.parent = parent;
        ground.transform.position = new Vector3(0, -0.5f, 0);
        ground.transform.localScale = new Vector3(CAMPUS_WIDTH + 20, 1, CAMPUS_HEIGHT + 20);
        
        Material groundMat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        groundMat.color = new Color(0.4f, 0.45f, 0.4f, 1f); // Concrete gray-green
        ground.GetComponent<Renderer>().material = groundMat;
    }
    
    private static void CreateRoads(Transform parent)
    {
        GameObject roads = new GameObject("Roads");
        roads.transform.parent = parent;
        
        // Main entrance road (vertical from top)
        CreateRoad(roads.transform, "MainEntranceRoad", new Vector3(0, 0.02f, 85), new Vector3(15, 0.1f, 30));
        
        // Main horizontal road (top)
        CreateRoad(roads.transform, "TopRoad", new Vector3(0, 0.02f, 70), new Vector3(180, 0.1f, 12));
        
        // Central horizontal road
        CreateRoad(roads.transform, "CentralRoad", new Vector3(-20, 0.02f, 20), new Vector3(120, 0.1f, 10));
        
        // Bottom horizontal road
        CreateRoad(roads.transform, "BottomRoad", new Vector3(0, 0.02f, -50), new Vector3(180, 0.1f, 10));
        
        // Left vertical road
        CreateRoad(roads.transform, "LeftRoad", new Vector3(-80, 0.02f, 10), new Vector3(10, 0.1f, 150));
        
        // Center-left vertical road
        CreateRoad(roads.transform, "CenterLeftRoad", new Vector3(-30, 0.02f, 0), new Vector3(10, 0.1f, 120));
        
        // Center vertical road
        CreateRoad(roads.transform, "CenterRoad", new Vector3(20, 0.02f, 10), new Vector3(10, 0.1f, 140));
        
        // Right vertical road
        CreateRoad(roads.transform, "RightRoad", new Vector3(60, 0.02f, 0), new Vector3(10, 0.1f, 160));
        
        // Far right road
        CreateRoad(roads.transform, "FarRightRoad", new Vector3(85, 0.02f, -20), new Vector3(8, 0.1f, 100));
    }
    
    private static void CreateRoad(Transform parent, string name, Vector3 position, Vector3 scale)
    {
        GameObject road = GameObject.CreatePrimitive(PrimitiveType.Cube);
        road.name = name;
        road.transform.parent = parent;
        road.transform.position = position;
        road.transform.localScale = scale;
        road.GetComponent<Renderer>().material = roadMaterial;
    }
    
    private static void CreateBuildings(Transform parent)
    {
        GameObject buildings = new GameObject("Buildings");
        buildings.transform.parent = parent;
        
        // === TOP ROW (North) ===
        
        // Design Thinking Huddle (top-left corner)
        CreateBuilding(buildings.transform, "Design Thinking Huddle", 
            new Vector3(-75, 0, 75), new Vector3(18, SMALL_BUILDING_HEIGHT, 12), accentMaterial);
        
        // Mechanical Dept
        CreateBuilding(buildings.transform, "Mechanical Dept", 
            new Vector3(-75, 0, 58), new Vector3(20, BUILDING_HEIGHT, 15), buildingMaterial);
        
        // Admin Block (large)
        CreateBuilding(buildings.transform, "ADMIN BLOCK", 
            new Vector3(-40, 0, 55), new Vector3(35, BUILDING_HEIGHT + 2, 25), buildingMaterial);
        
        // Security Cabin
        CreateBuilding(buildings.transform, "Security", 
            new Vector3(-5, 0, 78), new Vector3(8, 3, 6), buildingMaterial);
        
        // Kotak Mahindra Bank
        CreateBuilding(buildings.transform, "Kotak Mahindra Bank", 
            new Vector3(25, 0, 78), new Vector3(15, 4, 8), buildingMaterial);
        
        // Civil Dept
        CreateBuilding(buildings.transform, "Civil Dept", 
            new Vector3(30, 0, 55), new Vector3(25, BUILDING_HEIGHT, 20), buildingMaterial);
        
        // === SECOND ROW ===
        
        // Founder Statue area
        CreateBuilding(buildings.transform, "Founder Statue", 
            new Vector3(-85, 0, 40), new Vector3(5, 6, 5), accentMaterial);
        
        // Biotech Quadrangle
        CreateBuilding(buildings.transform, "Biotech Quadrangle", 
            new Vector3(-85, 0, 25), new Vector3(15, SMALL_BUILDING_HEIGHT, 15), accentMaterial);
        
        // IEM Auditorium
        CreateBuilding(buildings.transform, "IEM Auditorium", 
            new Vector3(-55, 0, 35), new Vector3(15, BUILDING_HEIGHT, 12), buildingMaterial);
        
        // KRIYAKALPA
        CreateBuilding(buildings.transform, "KRIYAKALPA", 
            new Vector3(-35, 0, 35), new Vector3(18, BUILDING_HEIGHT, 12), buildingMaterial);
        
        // EEE Dept
        CreateBuilding(buildings.transform, "EEE Dept", 
            new Vector3(10, 0, 38), new Vector3(20, BUILDING_HEIGHT, 18), buildingMaterial);
        
        // === THIRD ROW ===
        
        // RV University
        CreateBuilding(buildings.transform, "RV University", 
            new Vector3(-55, 0, 18), new Vector3(12, SMALL_BUILDING_HEIGHT, 10), buildingMaterial);
        
        // Thoda Aur Canteen
        CreateBuilding(buildings.transform, "Thoda Aur Canteen", 
            new Vector3(-40, 0, 18), new Vector3(10, 4, 8), buildingMaterial);
        
        // ECE Dept (large)
        CreateBuilding(buildings.transform, "ECE Dept", 
            new Vector3(-5, 0, 15), new Vector3(30, BUILDING_HEIGHT + 2, 25), buildingMaterial);
        
        // PE & Sports Dept
        CreateBuilding(buildings.transform, "PE & Sports Dept", 
            new Vector3(75, 0, 40), new Vector3(18, SMALL_BUILDING_HEIGHT, 12), buildingMaterial);
        
        // CSE Dept
        CreateBuilding(buildings.transform, "CSE Dept", 
            new Vector3(75, 0, 22), new Vector3(20, BUILDING_HEIGHT, 15), buildingMaterial);
        
        // Health Centre
        CreateBuilding(buildings.transform, "Health Centre", 
            new Vector3(75, 0, 5), new Vector3(18, SMALL_BUILDING_HEIGHT, 10), buildingMaterial);
        
        // Temple
        CreateBuilding(buildings.transform, "Temple", 
            new Vector3(85, 0, -8), new Vector3(10, 6, 10), accentMaterial);
        
        // === FOURTH ROW ===
        
        // Green House
        CreateBuilding(buildings.transform, "GREEN HOUSE", 
            new Vector3(-85, 0, 0), new Vector3(15, 4, 15), accentMaterial);
        
        // Parking 1
        CreateBuilding(buildings.transform, "Parking 1", 
            new Vector3(-60, 0, -5), new Vector3(8, 1, 12), roadMaterial);
        
        // Parking 2
        CreateBuilding(buildings.transform, "Parking 2", 
            new Vector3(-50, 0, -5), new Vector3(8, 1, 12), roadMaterial);
        
        // Chem Engg & Physics Dept
        CreateBuilding(buildings.transform, "Chem Engg & Physics Dept", 
            new Vector3(-55, 0, -20), new Vector3(25, BUILDING_HEIGHT, 15), buildingMaterial);
        
        // Telecommunication Dept
        CreateBuilding(buildings.transform, "Telecommunication Dept", 
            new Vector3(-20, 0, -20), new Vector3(22, BUILDING_HEIGHT, 15), buildingMaterial);
        
        // MINGOS Canteen
        CreateBuilding(buildings.transform, "MINGOS Canteen", 
            new Vector3(35, 0, -15), new Vector3(12, 4, 10), buildingMaterial);
        
        // Krishna Hostel
        CreateBuilding(buildings.transform, "Krishna Hostel", 
            new Vector3(75, 0, -22), new Vector3(20, BUILDING_HEIGHT, 15), buildingMaterial);
        
        // === FIFTH ROW ===
        
        // LIBRARY (large, prominent)
        CreateBuilding(buildings.transform, "LIBRARY", 
            new Vector3(-55, 0, -45), new Vector3(30, BUILDING_HEIGHT + 3, 22), accentMaterial);
        
        // ISE and Aerospace Dept
        CreateBuilding(buildings.transform, "ISE & Aerospace Dept", 
            new Vector3(-55, 0, -70), new Vector3(28, BUILDING_HEIGHT, 18), buildingMaterial);
        
        // Cauvery Boys Hostel
        CreateBuilding(buildings.transform, "Cauvery Boys Hostel", 
            new Vector3(75, 0, -50), new Vector3(22, BUILDING_HEIGHT, 18), buildingMaterial);
        
        // === BOTTOM ROW ===
        
        // Mathematics Dept
        CreateBuilding(buildings.transform, "Mathematics Dept", 
            new Vector3(75, 0, -78), new Vector3(20, BUILDING_HEIGHT, 15), buildingMaterial);
    }
    
    private static void CreateBuilding(Transform parent, string name, Vector3 position, Vector3 size, Material material)
    {
        // Create building group
        GameObject buildingGroup = new GameObject(name);
        buildingGroup.transform.parent = parent;
        buildingGroup.transform.position = position;
        
        // Main building structure
        GameObject building = GameObject.CreatePrimitive(PrimitiveType.Cube);
        building.name = "Structure";
        building.transform.parent = buildingGroup.transform;
        building.transform.localPosition = new Vector3(0, size.y / 2, 0);
        building.transform.localScale = size;
        building.GetComponent<Renderer>().material = material;
        
        // Add roof detail
        GameObject roof = GameObject.CreatePrimitive(PrimitiveType.Cube);
        roof.name = "Roof";
        roof.transform.parent = buildingGroup.transform;
        roof.transform.localPosition = new Vector3(0, size.y + 0.3f, 0);
        roof.transform.localScale = new Vector3(size.x + 0.5f, 0.6f, size.z + 0.5f);
        
        Material roofMat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        roofMat.color = new Color(0.4f, 0.42f, 0.45f, 1f);
        roof.GetComponent<Renderer>().material = roofMat;
        
        // Create 3D label
        CreateBuildingLabel(buildingGroup.transform, name, size.y + 2f);
        
        // Add ClickableBuilding component
        building.AddComponent<ClickableBuilding>();
    }
    
    private static void CreateBuildingLabel(Transform parent, string text, float height)
    {
        GameObject labelObj = new GameObject("Label");
        labelObj.transform.parent = parent;
        labelObj.transform.localPosition = new Vector3(0, height, 0);
        
        // Create TextMeshPro if available, otherwise use standard 3D text
        TextMesh textMesh = labelObj.AddComponent<TextMesh>();
        textMesh.text = text;
        textMesh.fontSize = 24;
        textMesh.characterSize = 0.5f;
        textMesh.anchor = TextAnchor.MiddleCenter;
        textMesh.alignment = TextAlignment.Center;
        textMesh.color = Color.white;
        textMesh.fontStyle = FontStyle.Bold;
        
        // Add billboard script to face camera
        labelObj.AddComponent<Billboard>();
    }
    
    private static void CreateGardens(Transform parent)
    {
        GameObject gardens = new GameObject("Gardens");
        gardens.transform.parent = parent;
        
        // Multiple garden areas based on the map
        CreateGarden(gardens.transform, "Garden_1", new Vector3(-70, 0.05f, 68), new Vector3(12, 0.1f, 8));
        CreateGarden(gardens.transform, "Garden_2", new Vector3(-5, 0.05f, 55), new Vector3(15, 0.1f, 12));
        CreateGarden(gardens.transform, "Garden_3", new Vector3(5, 0.05f, -35), new Vector3(18, 0.1f, 15));
        CreateGarden(gardens.transform, "Garden_4", new Vector3(-15, 0.05f, -55), new Vector3(15, 0.1f, 12));
        CreateGarden(gardens.transform, "Garden_5", new Vector3(25, 0.05f, -45), new Vector3(12, 0.1f, 10));
        CreateGarden(gardens.transform, "Garden_6", new Vector3(40, 0.05f, -60), new Vector3(15, 0.1f, 12));
        CreateGarden(gardens.transform, "Garden_7", new Vector3(55, 0.05f, -35), new Vector3(12, 0.1f, 10));
        CreateGarden(gardens.transform, "Garden_8", new Vector3(55, 0.05f, 0), new Vector3(10, 0.1f, 15));
        CreateGarden(gardens.transform, "Garden_9", new Vector3(88, 0.05f, 8), new Vector3(8, 0.1f, 10));
        CreateGarden(gardens.transform, "Garden_10", new Vector3(88, 0.05f, -35), new Vector3(8, 0.1f, 12));
        CreateGarden(gardens.transform, "Garden_11", new Vector3(88, 0.05f, -65), new Vector3(8, 0.1f, 10));
        
        // Add trees to gardens
        AddTreesToGarden(gardens.transform);
    }
    
    private static void CreateGarden(Transform parent, string name, Vector3 position, Vector3 scale)
    {
        GameObject garden = GameObject.CreatePrimitive(PrimitiveType.Cube);
        garden.name = name;
        garden.transform.parent = parent;
        garden.transform.position = position;
        garden.transform.localScale = scale;
        garden.GetComponent<Renderer>().material = grassMaterial;
    }
    
    private static void AddTreesToGarden(Transform parent)
    {
        // Add decorative trees throughout the campus
        Vector3[] treePositions = new Vector3[]
        {
            new Vector3(-70, 0, 68), new Vector3(-65, 0, 65),
            new Vector3(5, 0, -38), new Vector3(8, 0, -32),
            new Vector3(40, 0, -58), new Vector3(43, 0, -62),
            new Vector3(55, 0, -33), new Vector3(52, 0, -37),
            new Vector3(88, 0, 10), new Vector3(88, 0, -33),
            new Vector3(-12, 0, -53), new Vector3(-18, 0, -57),
        };
        
        foreach (var pos in treePositions)
        {
            CreateTree(parent, pos);
        }
    }
    
    private static void CreateTree(Transform parent, Vector3 position)
    {
        GameObject tree = new GameObject("Tree");
        tree.transform.parent = parent;
        tree.transform.position = position;
        
        // Trunk
        GameObject trunk = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        trunk.name = "Trunk";
        trunk.transform.parent = tree.transform;
        trunk.transform.localPosition = new Vector3(0, 1.5f, 0);
        trunk.transform.localScale = new Vector3(0.5f, 1.5f, 0.5f);
        
        Material trunkMat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        trunkMat.color = new Color(0.4f, 0.25f, 0.1f, 1f);
        trunk.GetComponent<Renderer>().material = trunkMat;
        
        // Foliage
        GameObject foliage = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        foliage.name = "Foliage";
        foliage.transform.parent = tree.transform;
        foliage.transform.localPosition = new Vector3(0, 4f, 0);
        foliage.transform.localScale = new Vector3(3f, 3f, 3f);
        
        Material foliageMat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        foliageMat.color = new Color(0.15f, 0.5f, 0.15f, 1f);
        foliage.GetComponent<Renderer>().material = foliageMat;
    }
    
    private static void CreateSportsGrounds(Transform parent)
    {
        GameObject sports = new GameObject("SportsGrounds");
        sports.transform.parent = parent;
        
        // Football & Cricket Ground (large area on the right)
        GameObject footballGround = GameObject.CreatePrimitive(PrimitiveType.Cube);
        footballGround.name = "Football & Cricket Ground";
        footballGround.transform.parent = sports.transform;
        footballGround.transform.position = new Vector3(60, 0.03f, 60);
        footballGround.transform.localScale = new Vector3(45, 0.1f, 35);
        footballGround.GetComponent<Renderer>().material = sportsMaterial;
        
        // Add field markings
        CreateFieldMarkings(sports.transform, new Vector3(60, 0.05f, 60));
        
        // Label for sports ground
        CreateBuildingLabel(footballGround.transform, "Football & Cricket Ground", 2f);
    }
    
    private static void CreateFieldMarkings(Transform parent, Vector3 center)
    {
        Material lineMat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        lineMat.color = Color.white;
        
        // Outer boundary
        CreateLine(parent, "BoundaryTop", new Vector3(center.x, 0.06f, center.z + 15), new Vector3(40, 0.05f, 0.3f), lineMat);
        CreateLine(parent, "BoundaryBottom", new Vector3(center.x, 0.06f, center.z - 15), new Vector3(40, 0.05f, 0.3f), lineMat);
        CreateLine(parent, "BoundaryLeft", new Vector3(center.x - 20, 0.06f, center.z), new Vector3(0.3f, 0.05f, 30), lineMat);
        CreateLine(parent, "BoundaryRight", new Vector3(center.x + 20, 0.06f, center.z), new Vector3(0.3f, 0.05f, 30), lineMat);
        
        // Center circle
        GameObject centerCircle = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        centerCircle.name = "CenterCircle";
        centerCircle.transform.parent = parent;
        centerCircle.transform.position = new Vector3(center.x, 0.06f, center.z);
        centerCircle.transform.localScale = new Vector3(8, 0.02f, 8);
        
        Material circleMat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        circleMat.color = new Color(0.35f, 0.75f, 0.35f, 1f);
        centerCircle.GetComponent<Renderer>().material = circleMat;
        
        // Center line
        CreateLine(parent, "CenterLine", new Vector3(center.x, 0.06f, center.z), new Vector3(0.3f, 0.05f, 30), lineMat);
    }
    
    private static void CreateLine(Transform parent, string name, Vector3 position, Vector3 scale, Material material)
    {
        GameObject line = GameObject.CreatePrimitive(PrimitiveType.Cube);
        line.name = name;
        line.transform.parent = parent;
        line.transform.position = position;
        line.transform.localScale = scale;
        line.GetComponent<Renderer>().material = material;
    }
    
    private static void CreateDecorations(Transform parent)
    {
        GameObject decorations = new GameObject("Decorations");
        decorations.transform.parent = parent;
        
        // Main Entrance marker
        GameObject entrance = GameObject.CreatePrimitive(PrimitiveType.Cube);
        entrance.name = "Main Entrance";
        entrance.transform.parent = decorations.transform;
        entrance.transform.position = new Vector3(0, 0, 95);
        entrance.transform.localScale = new Vector3(20, 3, 2);
        
        Material entranceMat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        entranceMat.color = new Color(0.6f, 0.3f, 0.1f, 1f);
        entrance.GetComponent<Renderer>().material = entranceMat;
        
        // Entrance pillars
        CreatePillar(decorations.transform, new Vector3(-8, 0, 92));
        CreatePillar(decorations.transform, new Vector3(8, 0, 92));
        
        // Entrance label
        CreateBuildingLabel(entrance.transform, "MAIN ENTRANCE", 5f);
    }
    
    private static void CreatePillar(Transform parent, Vector3 position)
    {
        GameObject pillar = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        pillar.name = "Pillar";
        pillar.transform.parent = parent;
        pillar.transform.position = position + new Vector3(0, 3, 0);
        pillar.transform.localScale = new Vector3(1.5f, 3, 1.5f);
        
        Material pillarMat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        pillarMat.color = new Color(0.7f, 0.65f, 0.6f, 1f);
        pillar.GetComponent<Renderer>().material = pillarMat;
    }
    
    private static void SetupCamera()
    {
        // Find or create main camera
        Camera mainCamera = Camera.main;
        if (mainCamera == null)
        {
            GameObject camObj = new GameObject("Main Camera");
            camObj.tag = "MainCamera";
            mainCamera = camObj.AddComponent<Camera>();
            camObj.AddComponent<AudioListener>();
        }
        
        // Position camera for good overview
        mainCamera.transform.position = new Vector3(0, 120, -100);
        mainCamera.transform.rotation = Quaternion.Euler(45, 0, 0);
        mainCamera.fieldOfView = 60;
        mainCamera.farClipPlane = 500;
        
        // Add CampusMapViewer for orbit controls
        if (mainCamera.GetComponent<CampusMapViewer>() == null)
        {
            mainCamera.gameObject.AddComponent<CampusMapViewer>();
        }
    }
    
    private static void SetupLighting()
    {
        // Find or create directional light
        Light[] lights = Object.FindObjectsByType<Light>(FindObjectsSortMode.None);
        Light directionalLight = null;
        
        foreach (var light in lights)
        {
            if (light.type == LightType.Directional)
            {
                directionalLight = light;
                break;
            }
        }
        
        if (directionalLight == null)
        {
            GameObject lightObj = new GameObject("Directional Light");
            directionalLight = lightObj.AddComponent<Light>();
            directionalLight.type = LightType.Directional;
        }
        
        // Setup sun-like lighting
        directionalLight.transform.rotation = Quaternion.Euler(50, -30, 0);
        directionalLight.color = new Color(1f, 0.95f, 0.85f, 1f);
        directionalLight.intensity = 1.2f;
        directionalLight.shadows = LightShadows.Soft;
        
        // Set ambient lighting
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Skybox;
        RenderSettings.ambientIntensity = 1f;
    }
}
