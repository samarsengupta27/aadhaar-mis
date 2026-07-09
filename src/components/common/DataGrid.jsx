import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

ModuleRegistry.registerModules([AllCommunityModule]);

export default function DataGrid({
  columnDefs,
  rowData,
  height = 500,
}) {
  return (
    <div
      className="ag-theme-quartz"
      style={{
        width: "100%",
        height,
      }}
    >
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        pagination
        paginationPageSize={10}
        defaultColDef={{
          sortable: true,
          filter: true,
          floatingFilter: true,
          resizable: true,
        }}
      />
    </div>
  );
}