(() => {
  const productionApi = "https://threadsme.akmalmarvis.com";
  const localApi = "http://127.0.0.1:8788";
  const params = new URLSearchParams(window.location.search);
  const override = params.get("api") || window.localStorage.getItem("THREADSME_API_MODE") || "";
  const host = window.location.hostname;
  const useProductionData = host === "threadsme.akmalmarvis.com" || host === "localhost";

  window.THREADSME_CONFIG = {
    apiUrl: override === "local"
      ? localApi
      : override === "production"
        ? productionApi
        : useProductionData
          ? productionApi
          : localApi,
    uiVersion: "0.10.2",
  };

  const uiStyles = document.createElement("style");
  uiStyles.textContent = '@import url("./assets/ui-enhancements.css?v=2");';
  document.head.append(uiStyles);
})();
