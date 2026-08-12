import React from "react";
import Navbar from "./NAYSA Cloud/Components/Navbar";
import Sidebar from "./NAYSA Cloud/Components/Sidebar";

const Layout = ({ children }) => {
    return (
      <div className="flex flex-col h-screen">
        {/* Navbar */}
        <div className="h-[60px]">
          <Navbar />
        </div>
  
        {/* Sidebar and Main Content */}
        <div className="flex flex-1">
          <div className="w-64">
            <Sidebar />
          </div>
          <main className="flex-1 bg-gray-50 p-4 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    );
  };
  
  export default Layout;