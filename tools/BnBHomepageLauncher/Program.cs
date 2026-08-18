using System.Diagnostics;
using System.Net.Http;
using System.Net.Sockets;

// 더블클릭만으로 로컬 홈페이지 서버를 켜기 위한 실행기입니다.
const int ServerPort = 3000;
const string ServerUrl = "http://localhost:3000";

Console.OutputEncoding = System.Text.Encoding.UTF8;
Console.Title = "Bit & Byte 홈페이지 서버";

try
{
    var projectDirectory = FindProjectDirectory();
    var npmPath = FindNpmCommand();

    Console.WriteLine("BnB 홈페이지 서버를 시작합니다.");
    Console.WriteLine($"프로젝트: {projectDirectory}");
    Console.WriteLine($"npm: {npmPath}");
    Console.WriteLine();

    EnsureDependencies(projectDirectory, npmPath);
    StartHomepageServer(projectDirectory, npmPath);
}
catch (Exception exception)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine();
    Console.WriteLine($"실행에 실패했습니다: {exception.Message}");
    Console.ResetColor();
    Console.WriteLine();
    Console.WriteLine("Node.js가 설치돼 있는지, 프로젝트 폴더에 package.json이 있는지 확인해 주세요.");
    Console.WriteLine("종료하려면 아무 키나 누르세요.");
    Console.ReadKey(true);
    Environment.Exit(1);
}

static string FindProjectDirectory()
{
    var candidates = new[]
    {
        AppContext.BaseDirectory,
        Directory.GetCurrentDirectory(),
        @"C:\Users\Luna\bnb-homepage",
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..")),
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..")),
    };

    foreach (var candidate in candidates.Distinct())
    {
        var directory = candidate.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        if (File.Exists(Path.Combine(directory, "package.json")))
        {
            return directory;
        }
    }

    throw new DirectoryNotFoundException("package.json이 있는 BnB 홈페이지 폴더를 찾지 못했습니다.");
}

static string FindNpmCommand()
{
    var candidates = new[]
    {
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "npm.cmd"),
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "nodejs", "npm.cmd"),
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "nodejs", "npm.cmd"),
    };

    foreach (var candidate in candidates)
    {
        if (File.Exists(candidate))
        {
            return candidate;
        }
    }

    var fromPath = FindOnPath("npm.cmd") ?? FindOnPath("npm");
    if (!string.IsNullOrWhiteSpace(fromPath))
    {
        return fromPath;
    }

    throw new FileNotFoundException("npm을 찾지 못했습니다. Node.js를 설치한 뒤 다시 실행해 주세요.");
}

static string? FindOnPath(string fileName)
{
    var pathValue = Environment.GetEnvironmentVariable("PATH") ?? "";
    foreach (var folder in pathValue.Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries))
    {
        var fullPath = Path.Combine(folder.Trim(), fileName);
        if (File.Exists(fullPath))
        {
            return fullPath;
        }
    }

    return null;
}

static void EnsureDependencies(string projectDirectory, string npmPath)
{
    var modulesDirectory = Path.Combine(projectDirectory, "node_modules");
    if (Directory.Exists(modulesDirectory))
    {
        return;
    }

    Console.WriteLine("필요한 패키지를 처음 설치합니다. 잠시만 기다려 주세요.");
    var install = StartCommand(npmPath, "install", projectDirectory, waitForExit: true);
    if (install.ExitCode != 0)
    {
        throw new InvalidOperationException("npm install이 실패했습니다.");
    }
}

static void StartHomepageServer(string projectDirectory, string npmPath)
{
    if (IsHomepageResponding())
    {
        Console.WriteLine("이미 홈페이지 서버가 켜져 있습니다. 브라우저만 엽니다.");
        OpenBrowser();
        Console.WriteLine($"주소: {ServerUrl}");
        Console.WriteLine("이 창은 닫아도 됩니다. 서버를 끄려면 먼저 켠 검은 창에서 Ctrl + C를 누르세요.");
        Console.WriteLine("종료하려면 아무 키나 누르세요.");
        Console.ReadKey(true);
        return;
    }

    if (IsPortOpen(ServerPort))
    {
        Console.WriteLine("포트 3000은 열려 있지만 페이지가 응답하지 않습니다. 멈춘 서버를 종료합니다.");
        StopProcessOnPort(ServerPort);
        Thread.Sleep(1500);
    }

    Console.WriteLine("개발 서버를 켭니다. 끄려면 이 창에서 Ctrl + C를 누르세요.");
    Console.WriteLine($"브라우저: {ServerUrl}");
    Console.WriteLine();

    // npm이 --hostname/--port를 자기 옵션으로 가로채므로 스크립트 기본값만 사용합니다.
    var server = StartCommand(npmPath, "run dev", projectDirectory, waitForExit: false);
    _ = OpenBrowserWhenReadyAsync(server);

    server.WaitForExit();
    if (server.ExitCode != 0 && IsPortOpen(ServerPort))
    {
        Console.WriteLine("서버는 이미 실행 중입니다. 브라우저를 열어 두었습니다.");
        OpenBrowser();
        return;
    }

    if (server.ExitCode != 0)
    {
        throw new InvalidOperationException($"서버가 예기치 않게 종료되었습니다. 종료 코드: {server.ExitCode}");
    }
}

static void OpenBrowser()
{
    try
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = ServerUrl,
            UseShellExecute = true,
        });
    }
    catch
    {
        Console.WriteLine($"브라우저를 직접 열어 주세요: {ServerUrl}");
    }
}

static Process StartCommand(string fileName, string arguments, string workingDirectory, bool waitForExit)
{
    var nodeDirectory = Path.GetDirectoryName(fileName);
    var startInfo = new ProcessStartInfo
    {
        FileName = fileName,
        Arguments = arguments,
        WorkingDirectory = workingDirectory,
        UseShellExecute = false,
        RedirectStandardOutput = false,
        RedirectStandardError = false,
    };

    if (!string.IsNullOrWhiteSpace(nodeDirectory))
    {
        var currentPath = Environment.GetEnvironmentVariable("PATH") ?? "";
        startInfo.Environment["PATH"] = nodeDirectory + Path.PathSeparator + currentPath;
    }

    var process = Process.Start(startInfo);
    if (process is null)
    {
        throw new InvalidOperationException($"{fileName}을 실행하지 못했습니다.");
    }

    if (waitForExit)
    {
        process.WaitForExit();
    }

    return process;
}

static async Task OpenBrowserWhenReadyAsync(Process server)
{
    for (var attempt = 0; attempt < 40 && !server.HasExited; attempt += 1)
    {
        await Task.Delay(TimeSpan.FromMilliseconds(500));
        if (!IsHomepageResponding())
        {
            continue;
        }

        OpenBrowser();
        return;
    }
}

static bool IsHomepageResponding()
{
    try
    {
        using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
        using var response = httpClient.GetAsync(ServerUrl).GetAwaiter().GetResult();
        return response.IsSuccessStatusCode;
    }
    catch
    {
        return false;
    }
}

static void StopProcessOnPort(int port)
{
    var processId = FindListeningProcessId(port);
    if (processId is null)
    {
        return;
    }

    try
    {
        using var process = Process.GetProcessById(processId.Value);
        process.Kill(entireProcessTree: true);
        process.WaitForExit(3000);
    }
    catch (Exception exception)
    {
        Console.WriteLine($"멈춘 서버(PID {processId})를 종료하지 못했습니다: {exception.Message}");
    }
}

static int? FindListeningProcessId(int port)
{
    try
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = "powershell.exe",
            Arguments = $"-NoProfile -Command \"(Get-NetTCPConnection -LocalPort {port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess\"",
            UseShellExecute = false,
            RedirectStandardOutput = true,
            CreateNoWindow = true,
        };

        using var process = Process.Start(startInfo);
        if (process is null)
        {
            return null;
        }

        var output = process.StandardOutput.ReadToEnd();
        process.WaitForExit(3000);
        return int.TryParse(output.Trim(), out var processId) ? processId : null;
    }
    catch
    {
        return null;
    }
}

static bool IsPortOpen(int port)
{
    try
    {
        using var client = new TcpClient();
        var task = client.ConnectAsync("127.0.0.1", port);
        return task.Wait(TimeSpan.FromMilliseconds(250)) && client.Connected;
    }
    catch
    {
        return false;
    }
}
