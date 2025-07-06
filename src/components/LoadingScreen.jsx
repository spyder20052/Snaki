import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import snakiLogo from "./snaki.webp"; // adapte le chemin à ton projet

const LoadingScreen = ({ isLoading }) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background dark:bg-gray-900"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.1,
            transition: { duration: 0.7, ease: [0.6, -0.05, 0.01, 0.99], delay: 0.5 }
          }}
        >
          {/* Animation du logo : apparition avec scale et opacité */}
          <motion.img
            src={snakiLogo}
            alt="Logo Snaki"
            className="mb-6 w-40 select-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />

          {/* Barre de chargement animée */}
          <motion.div
            className="mt-4 w-48 h-2 bg-primary/20 rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.2 } }}
          >
            <motion.div
              className="h-full bg-primary"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.5, ease: "linear", delay: 0.5 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingScreen;
