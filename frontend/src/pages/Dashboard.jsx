import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import MetricsBar from '../components/MetricsBar';
import TransactionStream from '../components/TransactionStream';
import ForensicDrawer from '../components/ForensicDrawer';
import SandboxModal from '../components/SandboxModal';
import { socket } from '../services/socket';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [transactions, setTransactions] = useState([]);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onTransactionScored(data) {
      setTransactions((prev) => [data, ...prev.slice(0, 49)]);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('transaction:scored', onTransactionScored);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('transaction:scored', onTransactionScored);
    };
  }, []);

  const handleManualResult = (resultData) => {
    setTransactions((prev) => [resultData, ...prev.slice(0, 49)]);
    setSelectedTxn(resultData);
  };

  const handleClearStream = () => {
    setTransactions([]);
    setSelectedTxn(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-sentinel-50 selection:bg-sentinel-200">
      {/* Header */}
      <Header
        isConnected={isConnected}
        onOpenSandbox={() => setIsSandboxOpen(true)}
        onOpenApiDocs={() => navigate('/docs')} // Routes to new page!
        onClearStream={handleClearStream}
      />

      <MetricsBar transactions={transactions} />

      <TransactionStream
        transactions={transactions}
        selectedTxn={selectedTxn}
        onSelectTxn={(item) => setSelectedTxn(item)}
      />

      <ForensicDrawer
        item={selectedTxn}
        onClose={() => setSelectedTxn(null)}
      />

      <SandboxModal
        isOpen={isSandboxOpen}
        onClose={() => setIsSandboxOpen(false)}
        onResult={handleManualResult}
      />
    </div>
  );
}