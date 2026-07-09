import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#7B1E28",
    },
    secondary: {
      main: "#F4E9D8",
    },
    background: {
      default: "#F7F3EB",
    },
  },

  typography: {
    fontFamily: "Segoe UI, Roboto, Arial, sans-serif",
  },

  shape: {
    borderRadius: 10,
  },

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
  },
});

export default theme;