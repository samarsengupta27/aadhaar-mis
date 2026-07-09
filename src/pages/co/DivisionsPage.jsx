import { useMemo } from "react";
import PageHeader from "../../components/common/PageHeader";
import DataGrid from "../../components/common/DataGrid";
import { seedDivisionMaster } from "../../services/masterDataService";
export default function DivisionsPage() {

const columnDefs = useMemo(() => [
  { headerName: "Code", field: "code", width: 120 },
  { headerName: "Division", field: "name", flex: 1 },
  { headerName: "Region", field: "regionId", width: 150 },
  {
    headerName: "Revenue Target",
    field: "monthlyRevenueTarget",
    width: 180,
  },
  {
    headerName: "Transaction Target",
    field: "monthlyTransactionTarget",
    width: 180,
  },
  { headerName: "Status", field: "status", width: 120 },
], []);

  const rowData = [];

  return (
    <div>
      <PageHeader
  title="Division Master"
  subtitle="Manage Divisions under Assam Circle"
  buttonText="Seed Division Master"
  onButtonClick={seedDivisionMaster}
/>

      <DataGrid
        columnDefs={columnDefs}
        rowData={rowData}
      />
    </div>
  );
}