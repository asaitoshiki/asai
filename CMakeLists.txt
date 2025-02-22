cmake_minimum_required(VERSION 3.10)
project(MyOpenCVProject)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# OpenCV 3.2 を明示的に探す
find_package(OpenCV 3 REQUIRED)

add_executable(my_program main.cpp)

# OpenCV のライブラリをリンク
target_link_libraries(my_program ${OpenCV_LIBS})
