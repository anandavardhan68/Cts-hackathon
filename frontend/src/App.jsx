
import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';

// Import Pages
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import ApiDocs from './pages/ApiDocs';
import GraphExplorer from './pages/GraphExplorer';

// Import Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// 1. We create a layout specifically for your public SaaS pages
function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-sentinel-50">
      <Navbar />
      <main className="flex-1">
        <Outlet /> {/* This is where Landing, Docs, and Graph will render */}
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* GROUP A: Pages that need the Navbar and Footer */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/docs" element={<ApiDocs />} />
          <Route path="/graph" element={<GraphExplorer />} />
        </Route>

        {/* GROUP B: The Dashboard (Fullscreen Terminal, no global Nav/Footer) */}
        <Route path="/dashboard" element={<Dashboard />} />

      </Routes>
    </BrowserRouter>
  );
}


// import React, { useState, useEffect } from 'react';
// import Header from './components/Header';
// import MetricsBar from './components/MetricsBar';
// import TransactionStream from './components/TransactionStream';
// import ForensicDrawer from './components/ForensicDrawer';
// import SandboxModal from './components/SandboxModal';
// import ApiDocsModal from './components/ApiDocsModal';
// import { socket } from './services/socket';

// export default function App() {
//   const [isConnected, setIsConnected] = useState(socket.connected);
//   const [transactions, setTransactions] = useState([]);
//   const [selectedTxn, setSelectedTxn] = useState(null);
//   const [isSandboxOpen, setIsSandboxOpen] = useState(false);
//   const [isApiDocsOpen, setIsApiDocsOpen] = useState(false);

//   useEffect(() => {
//     function onConnect() {
//       setIsConnected(true);
//     }

//     function onDisconnect() {
//       setIsConnected(false);
//     }

//     function onTransactionScored(data) {
//       setTransactions((prev) => [data, ...prev.slice(0, 49)]); // buffer last 50
//     }

//     socket.on('connect', onConnect);
//     socket.on('disconnect', onDisconnect);
//     socket.on('transaction:scored', onTransactionScored);

//     return () => {
//       socket.off('connect', onConnect);
//       socket.off('disconnect', onDisconnect);
//       socket.off('transaction:scored', onTransactionScored);
//     };
//   }, []);

//   const handleManualResult = (resultData) => {
//     setTransactions((prev) => [resultData, ...prev.slice(0, 49)]);
//     setSelectedTxn(resultData); // automatically open inspector for manual evaluation
//   };

//   const handleClearStream = () => {
//     setTransactions([]);
//     setSelectedTxn(null);
//   };

//   return (
//     <div className="min-h-screen flex flex-col bg-sentinel-50 selection:bg-sentinel-200">
//       {/* Header */}
//       <Header
//         isConnected={isConnected}
//         onOpenSandbox={() => setIsSandboxOpen(true)}
//         onOpenApiDocs={() => setIsApiDocsOpen(true)}
//         onClearStream={handleClearStream}
//       />

//       {/* Real-time KPI Bar */}
//       <MetricsBar transactions={transactions} />

//       {/* Main Tabular View */}
//       <TransactionStream
//         transactions={transactions}
//         selectedTxn={selectedTxn}
//         onSelectTxn={(item) => setSelectedTxn(item)}
//       />

//       {/* Forensic Slide-over Drawer */}
//       <ForensicDrawer
//         item={selectedTxn}
//         onClose={() => setSelectedTxn(null)}
//       />

//       {/* Judge Test Sandbox Modal */}
//       <SandboxModal
//         isOpen={isSandboxOpen}
//         onClose={() => setIsSandboxOpen(false)}
//         onResult={handleManualResult}
//       />

//       {/* FDaaS API Documentation Modal */}
//       <ApiDocsModal
//         isOpen={isApiDocsOpen}
//         onClose={() => setIsApiDocsOpen(false)}
//       />
//     </div>
//   );
// }