// export function LoadingSpinner() {
//   return (
//     /* Change 'absolute' to 'fixed' to center on the screen regardless of parent layout */
//     <div className="fixed inset-0 z-[9999] flex items-center justify-center isolate bg-white/60">
//       <div className="relative flex items-center justify-center w-24 h-24">
//         {/* Static Ring */}
//         <div className="absolute inset-0 border-[3px] border-slate-300/50 rounded-full"></div>
        
//         {/* Animated Ring */}
//         <div className="absolute inset-0 border-[4px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        
//         {/* Logo */}
//         <img 
//           src="/naysa_logo.png" 
//           alt="Loading" 
//           className="w-12 h-12 object-contain" 
//           style={{ filter: 'none' }} 
//         />
//       </div>
//     </div>
//   );
// }



// export function LoadingSpinner() {
//   return (
//     <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto">
//       <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-white/80 backdrop-blur-sm shadow-xl">
//         <div className="absolute inset-0 rounded-full bg-slate-200/40 blur-2xl scale-150"></div>

//         <div className="absolute inset-2 border-[3px] border-slate-300/50 rounded-full"></div>
//         <div className="absolute inset-2 border-[4px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>

//         <img
//           src="/naysa_logo.png"
//           alt="Loading"
//           className="relative w-12 h-12 object-contain"
//         />
//       </div>
//     </div>
//   );
// }



// export function LoadingSpinner() {
//   return (
//     <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto">
//       {/* Very light screen overlay */}
//       <div className="absolute inset-0 bg-black/10" />

//       {/* Focused loading container */}
//       <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-white/75 backdrop-blur-sm shadow-lg">
//         {/* Soft glow / radius dim effect */}
//         <div className="absolute inset-0 rounded-full bg-white/40 blur-xl scale-125"></div>

//         {/* Static Ring */}
//         <div className="absolute inset-2 border-[3px] border-slate-300/50 rounded-full"></div>

//         {/* Animated Ring */}
//         <div className="absolute inset-2 border-[4px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>

//         {/* Logo */}
//         <img
//           src="/naysa_logo.png"
//           alt="Loading"
//           className="relative w-12 h-12 object-contain"
//           style={{ filter: "none" }}
//         />
//       </div>
//     </div>
//   );
// }


// export function LoadingSpinner() {
//   return (
//     <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-in fade-in duration-200">
//       {/* Light overlay */}
//       <div className="absolute inset-0 bg-slate-900/10" />

//       {/* Floating loader container */}
//       <div className="relative flex flex-col items-center justify-center gap-2 sm:gap-3 px-4 py-4 sm:px-6 sm:py-5 rounded-xl sm:rounded-2xl bg-white/85 backdrop-blur-md border border-white/40 shadow-2xl">
//         {/* Soft background glow */}
//         <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-white/30 blur-xl scale-110 pointer-events-none"></div>

//         {/* Spinner area */}
//         <div className="relative flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20">
//           {/* Static ring */}
//           <div className="absolute inset-0 rounded-full border-[2px] border-slate-200"></div>

//           {/* Animated ring */}
//           <div className="absolute inset-0 rounded-full border-[3px] border-blue-600 border-t-transparent animate-spin"></div>

//           {/* Logo */}
//           <img
//             src="/naysa_logo.png"
//             alt="Loading"
//             className="relative w-9 h-9 sm:w-14 sm:h-14 object-contain"
//             draggable={false}
//           />
//         </div>

//         {/* Label */}
//         <div className="relative text-xs sm:text-sm font-medium text-slate-700 tracking-wide text-center">
//           Loading, please wait...
//         </div>
//       </div>
//     </div>
//   );
// }


export function LoadingSpinner() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-in fade-in duration-200">
      {/* Light overlay */}
      <div className="absolute inset-0 bg-slate-950/5" />

      {/* Floating loader container */}
      <div className="relative flex min-w-[132px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/70 bg-white/90 px-6 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.22)] backdrop-blur-xl">
        {/* Soft background glow */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-white/40 blur-xl"></div>
        <div className="pointer-events-none absolute -top-px left-5 right-5 h-px bg-white/90"></div>

        {/* Spinner area */}
        <div className="relative flex h-[72px] w-[72px] items-center justify-center sm:h-20 sm:w-20">
          <div className="absolute inset-0 rounded-full bg-blue-50"></div>
          <div className="absolute inset-1 rounded-full border border-slate-200"></div>
          <div className="absolute inset-1 animate-spin" style={{ animationDuration: "1.35s" }}>
            <div className="absolute inset-0 rounded-full border-[3px] border-blue-600 border-r-transparent border-t-transparent"></div>
          </div>
          <div className="absolute inset-3 rounded-full bg-white shadow-inner"></div>

          {/* Logo */}
          <img
            src="/naysa_logo.png"
            alt="Loading"
            className="relative h-14 w-14 object-contain sm:h-16 sm:w-16"
            draggable={false}
          />
        </div>

        {/* Animated brand letters */}
        <div className="relative flex flex-col items-center justify-center leading-tight" aria-label="Loading">
          {["N A Y S A", "Financials", "Cloud"].map((line, lineIndex) => (
            <div key={line} className="flex items-center justify-center gap-x-1">
              {line.split("").map((letter, index) => (
                <span
                  key={`${line}-${letter}-${index}`}
                  className="text-[10px] font-extrabold tracking-wide text-blue-700 animate-pulse"
                  style={{ animationDelay: `${(lineIndex * 6 + index) * 45}ms`, animationDuration: "1s" }}
                >
                  {letter === " " ? "\u00A0" : letter}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// export function LoadingSpinner() {
//   return (
//     <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-in fade-in duration-200">
//       <div className="absolute inset-0 bg-black/5" />

//       <div className="relative flex flex-col items-center justify-center gap-3 min-w-[180px] px-6 py-5 rounded-2xl bg-white border border-slate-200 shadow-xl">
//         <div className="relative flex items-center justify-center w-16 h-16">
//           <div className="absolute inset-0 rounded-full border-2 border-slate-200"></div>
//           <div className="absolute inset-0 rounded-full border-[3px] border-blue-600 border-t-transparent animate-spin"></div>

//           <img
//             src="/naysa_logo.png"
//             alt="Loading"
//             className="relative w-9 h-9 object-contain"
//             draggable={false}
//           />
//         </div>

//         <p className="text-sm font-medium text-slate-700">Processing...</p>
//       </div>
//     </div>
//   );
// }
