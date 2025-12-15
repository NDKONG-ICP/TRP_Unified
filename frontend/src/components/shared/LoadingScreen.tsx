import { motion } from 'framer-motion';

export default function LoadingScreen() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        {/* Animated Logo */}
        <motion.div
          className="relative w-20 h-20 mx-auto mb-6"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute inset-0 bg-gradient-gold rounded-2xl rotate-45 opacity-20" />
          <motion.div
            className="absolute inset-2 bg-gradient-gold rounded-xl rotate-45"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <div className="absolute inset-4 bg-raven-black rounded-lg rotate-45 flex items-center justify-center">
            <span className="text-2xl -rotate-45">🦅</span>
          </div>
        </motion.div>

        {/* Loading Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-display font-semibold text-gold-400 mb-2">
            Loading
          </h2>
          <div className="flex justify-center space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-gold-500 rounded-full"
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}






