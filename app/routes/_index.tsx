export default function IndexPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-white text-black font-sans text-center">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
          Welcome to QuantumByte app
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-stone-700 leading-relaxed">
          If you seeing this view that mean you are seeing QuantumByte template base app.
        </p>

        <div className="pt-4">
          <p className="text-lg sm:text-xl md:text-2xl font-semibold text-black border border-black px-6 py-4 inline-block">
            Ask the agent to build your idea now!!!
          </p>
        </div>
      </div>
    </div>
  );
}
