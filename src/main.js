
import WMTSLayer from "@arcgis/core/layers/WMTSLayer";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";


// 引入组件标签注册
import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-zoom";
import "@arcgis/msap-components/components/arcgis-search";
import "@arcgis/map-components/components/arcgis-legend";

// 引入 ArcGIS map-components 样式与 Calcite 样式
import "@arcgis/map-components/arcgis-map-components/arcgis-map-components.css";
import "@esri/calcite-components/main.css";

// 导入本地样式
import "./style.css";

// 引入 Core API
import esriConfig from "@arcgis/core/config";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";

import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter";

// 0. 全局设置 API Key（一次设置，全局生效）
esriConfig.apiKey = "AAPTaKZWs7ZteVc5x7nq1Vjcp0g..zbiOw2VSA2U3UtuqrAiP6HVLsV1cN8B15izj0vfkRCYwFAsCK-MjCr2PY4LXQ2s6zEC2cyupUpCdMyQu28cuyZ2zpCXM4uXW310k4so09u1XHAktuorPrlNEYejPE-Kt9bkX7H6O-zRF4GozQmL2NaLk8tSNbcyTKlom35v5LSVThuTOhe-f4Nk46NuKawobo0mMWsA9Z1D65mQtlzOtkMvsuwEj0nVN_BVsomj6Om5s1Aa164MhJl22LQ..AT1_lZg7FDHo";

// 1. 创建带渲染器与弹窗模板的 FeatureLayer
const citiesLayer = new FeatureLayer({
  url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services" +
    "/USA_Major_Cities_/FeatureServer/0",
  title: "美国主要城市",
  outFields: ["NAME", "POPULATION", "STATE_ABBR"],

  // 按人口分级渲染（ClassBreaks）
  renderer: {
    type: "class-breaks",
    field: "POPULATION",
    classBreakInfos: [
      {
        minValue: 0, maxValue: 100000,
        symbol: { type: "simple-marker", color: "#7dd3fc", size: 6 }
      },
      {
        minValue: 100000, maxValue: 500000,
        symbol: { type: "simple-marker", color: "#0099CC", size: 9 }
      },
      {
        minValue: 500000, maxValue: 1000000,
        symbol: { type: "simple-marker", color: "#7B5CFF", size: 12 }
      },
      {
        minValue: 1000000, maxValue: 99000000,
        symbol: { type: "simple-marker", color: "#FF8A3D", size: 16 }
      }
    ]
  },

  // 弹窗模板
  popupTemplate: {
    title: "{NAME}",
    content: "州：{STATE_ABBR}  ·  人口：{POPULATION}"
  }
});

// 加载 OGC WMTS 服务（Esri World Topo Map 提供 WMTS 接口）
const wmtsLayer = new WMTSLayer({
  url: "https://services.arcgisonline.com/arcgis/rest/services" +
    "/World_Topo_Map/MapServer/WMTS",
  title: "WMTS 参考底图（半透明）",
  opacity: 0.4
});

const sketchLayer = new GraphicsLayer({ id: "sketchLayer", title: "我的绘制" });

// 客户端图层：加载 USGS 公开的近 7 天 M2.5+ 地震数据
const earthquakesLayer = new GeoJSONLayer({
  // ↓ url 指向 GeoJSON 文件 → 客户端图层
  url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson",
  title: "近 7 天地震 (M2.5+)",
  copyright: "USGS",
  outFields: ["*"],

  // 字段定义 (GeoJSON 服务不自动推断, 显式声明)
  fields: [
    { name: "mag", type: "double", alias: "震级" },
    { name: "place", type: "string", alias: "位置" },
    { name: "time", type: "date", alias: "时间" }
  ],

  // 按震级分级
  renderer: {
    type: "class-breaks",
    field: "mag",
    classBreakInfos: [
      {
        minValue: 0, maxValue: 3.0,
        symbol: { type: "simple-marker", color: "#FED976", size: 5, outline: { color: "white", width: 0.5 } }
      },
      {
        minValue: 3.0, maxValue: 4.5,
        symbol: { type: "simple-marker", color: "#FD8D3C", size: 8, outline: { color: "white", width: 0.5 } }
      },
      {
        minValue: 4.5, maxValue: 6.0,
        symbol: { type: "simple-marker", color: "#E31A1C", size: 12, outline: { color: "white", width: 0.5 } }
      },
      {
        minValue: 6.0, maxValue: 10,
        symbol: { type: "simple-marker", color: "#800026", size: 18, outline: { color: "white", width: 1 } }
      }
    ]
  },

  popupTemplate: {
    title: "M{mag}  ·  {place}",
    content: "震级: <b>{mag}</b><br>位置: {place}"
  }
});


// 2. 等待 arcgis-map 就绪后添加图层
const mapEl = document.getElementById("mapEl");

mapEl.addEventListener("arcgisViewReadyChange", async (event) => {
  if (!event.target.ready) return;

  const map = event.target.map;
  const view = event.target.view;

  // 先添加 WMTS（底层）
  //map.add(wmtsLayer);
  // 后添加要素点（上层）
  map.add(citiesLayer);
  map.add(sketchLayer);

  map.add(earthquakesLayer);

  console.log("✓ 所有图层加载完成");
  // 对比两个图层的类型
  console.log("citiesLayer 类型:", citiesLayer.type);       // → "feature"
  console.log("earthquakesLayer 类型:", earthquakesLayer.type);    // → "geojson"


  // 获取 citiesLayer 的 layerView
  const citiesLV = await view.whenLayerView(citiesLayer);
  await reactiveUtils.whenOnce(() => !citiesLV.updating);


  // === 监听地图点击 ===
  view.on("click", async (e) => {
    console.log("点击坐标:", e.mapPoint.longitude.toFixed(4),
      e.mapPoint.latitude.toFixed(4));

    // hitTest 识别命中的要素
    const { results } = await view.hitTest(e);
    const top = results[0];
    if (top && top.graphic) {
      console.log("命中要素属性:", top.graphic.attributes);
    } else {
      console.log("未命中任何要素");
    }


    // 1. 生成 200km 缓冲区
    const buffer = geometryEngine.geodesicBuffer(
      e.mapPoint, 200, "kilometers"
    );

    // 构造通用查询条件
    const queryParams = {
      geometry: buffer,
      spatialRelationship: "intersects",
      returnGeometry: false,
      outFields: ["NAME", "POPULATION"]
    };

    // ===== 方式 A: 服务端查询 (citiesLayer) =====
    console.time("[A] 服务端查询");
    const serverResult = await citiesLayer.queryFeatures(queryParams);
    console.timeEnd("[A] 服务端查询");
    console.log("   → 返回", serverResult.features.length, "条 (服务端全集)");

    // ===== 方式 B: 客户端查询 (citiesLayerView) =====
    console.time("[B] 客户端查询");
    const clientResult = await citiesLV.queryFeatures(queryParams);
    console.timeEnd("[B] 客户端查询");
    console.log("   → 返回", clientResult.features.length, "条 (仅 view 可绘制)");

    // 显示结果到面板
    document.getElementById("resultText").textContent =
      `点击周边: 服务端 ${serverResult.features.length} / 客户端 ${clientResult.features.length}`;

  });

  // 1. 获取 GeoJSONLayer 对应的 layerView
  const earthquakesLV = await view.whenLayerView(earthquakesLayer);

  // 2. 等待 layerView 完成数据加载 (重要!)
  await reactiveUtils.whenOnce(() => !earthquakesLV.updating);
  console.log("✓ LayerView 数据加载完成, 可以查询");

  // 3. 滑块绑定查询
  const slider = document.getElementById("magSlider");
  const magValue = document.getElementById("magValue");
  const resultText = document.getElementById("resultText");

  async function updateQuery() {
    const threshold = parseFloat(slider.value);
    magValue.textContent = `M ≥ ${threshold.toFixed(1)}`;

    // ★ 关键变化：用 FeatureFilter 直接控制 LayerView 显示
    earthquakesLV.filter = new FeatureFilter({
      where: `mag >= ${threshold}`
    });

    // 仍然查询数量做统计 (可选)
    const result = await earthquakesLV.queryFeatures({
      where: `mag >= ${threshold}`,
      returnGeometry: false
    });
    resultText.textContent = `显示: ${result.features.length} 条地震`;
  }


  slider.addEventListener("input", updateQuery);
  updateQuery();   // 初始化一次



  document.getElementById("btnFilter").addEventListener("click", () => {
    // 方式 A: FeatureFilter (LayerView 客户端)
    earthquakesLV.filter = new FeatureFilter({ where: "mag >= 5" });
    earthquakesLayer.definitionExpression = null;
    console.log("[A] FeatureFilter: 客户端过滤, 不发请求");
  });

  document.getElementById("btnDef").addEventListener("click", () => {
    // 方式 B: definitionExpression (Layer)
    earthquakesLV.filter = null;
    earthquakesLayer.definitionExpression = "mag >= 5";
    console.log("[B] definitionExpression: 在客户端图层上, 仍是客户端过滤");

    // 试试服务端图层 (citiesLayer) - 这个会发请求
    // citiesLayer.definitionExpression = "POPULATION > 500000";
  });

  document.getElementById("btnReset").addEventListener("click", () => {
    earthquakesLV.filter = null;
    earthquakesLayer.definitionExpression = null;
    console.log("✓ 已重置, 显示全部要素");
  });



});
